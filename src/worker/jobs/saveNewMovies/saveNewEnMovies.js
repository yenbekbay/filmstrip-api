/* @flow */

import _ from 'lodash/fp';
import slugify from 'slugify';

import { isProduction } from '../../../env';
import { Movies } from '../../../mongo';
import type { JobContext } from './';
import type { YtsRelease } from '../../../types';

const ensureNewMovie = async (
  { logger, movieApi }: JobContext,
  query: {
    imdbId?: ?string,
    kpId?: ?number,
    title: string,
    year: number,
  },
) => {
  try {
    const savedMovieByQuery = await Movies.getByQuery({
      $or: _.compact([
        { 'info.title.en': query.title, 'info.year': query.year },
        query.imdbId && { 'info.imdbId': query.imdbId },
        query.kpId && { 'info.kpId': query.kpId },
      ]),
    });
    if (savedMovieByQuery) {
      logger.debug(`Skipping movie "${query.title}"`);
      return null;
    }

    const tmdbMatch = await movieApi.findMatchOnTmdb(query);
    if (!tmdbMatch) {
      logger.debug(`No match found on TMDB for movie "${query.title}"`);
      return null;
    }

    const savedMovieByTmdbMatch = await Movies.getByQuery({
      $or: _.compact([
        { 'info.title.en': tmdbMatch.title, 'info.year': query.year },
        { 'info.tmdbId': tmdbMatch.tmdbId },
      ]),
    });
    if (savedMovieByTmdbMatch) {
      logger.debug(`Skipping movie "${tmdbMatch.title}"`);
      return null;
    }

    logger.debug(`Saving movie "${tmdbMatch.title}"`);

    return { ...query, ...tmdbMatch };
  } catch (err) {
    logger.error(`Failed to check movie "${query.title}":`, err.message);
    logger.verbose(err.stack);

    return null;
  }
};

const newMoviesFromYts = async (context: JobContext) => {
  const { logger, yts } = context;

  const releases = await yts.getLatestReleases();
  logger.debug(`Got ${releases.length} releases from YTS`);

  return _.compact(await Promise.all(
    releases.reverse().map(async (release: YtsRelease) => {
      const newMovie = await ensureNewMovie(context, { ...release });
      if (!newMovie) return null;

      return {
        ...newMovie,
        ytsId: release.ytsId,
        youtubeId: release.youtubeId,
        torrents: release.torrents,
      };
    }),
  ));
};

const newMoviesFromTpb = async (context: JobContext) => {
  const { logger, tpb } = context;

  const movieQueries = _.uniqBy('title', await tpb.getTopMovies());
  logger.debug(`Got ${movieQueries.length} movies from The Pirate Bay`);

  return _.compact(await Promise.all(
    movieQueries.map(async (query: { title: string, year: number }) =>
      ensureNewMovie(context, { ...query }),
    ),
  ));
};

const saveNewEnMovies = async (context: JobContext) => {
  const { logger, tpb, movieApi } = context;

  const ytsMovies = await newMoviesFromYts(context);
  const tpbMovies = await newMoviesFromTpb(context);

  // remove duplicates
  const allMovies = _.uniqBy('title', [...ytsMovies, ...tpbMovies]);

  const movies = isProduction ? allMovies : allMovies.slice(0, 2);
  let savedCount = 0;

  // eslint-disable-next-line no-restricted-syntax
  for (const movie of movies) {
    try {
      const [info, tpbTorrents] = await Promise.all([
        movieApi.getMovieInfo({ ...movie }),
        tpb.getTorrentsForMovie({ ...movie }),
      ]);

      if (info && (tpbTorrents.length > 0 || !!movie.torrents)) {
        const title: string = ((info.title.en || info.title.ru): any);
        const year = info.year || movie.year;

        await Movies.insertOne({
          slug: `${slugify(title).toLowerCase()}-${year}`,
          torrents: {
            en: [...(movie.torrents || []), ...tpbTorrents],
          },
          info: {
            ...info,
            year,
            youtubeIds: {
              ...info.youtubeIds,
              en: _.flow(_.compact, _.uniq)(
                [...(info.youtubeIds.en || []), movie.youtubeId],
              ),
            },
            ytsId: movie.ytsId,
          },
        });

        logger.info(`Saved movie "${movie.title}"`);
        savedCount += 1;
      } else if (!info) {
        logger.warn(`Failed to get info for movie "${movie.title}"`);
      } else {
        logger.warn(`Failed to get torrents for movie "${movie.title}"`);
      }

      // let's be good guys
      await new Promise((resolve: () => void) => setTimeout(resolve, 4000));
    } catch (err) {
      logger.error(`Failed to save movie "${movie.title}":`, err.message);
      logger.verbose(err.stack);
    }
  }

  logger.info(`Saved ${savedCount} new movies in English`);
};

saveNewEnMovies.interval = '00 04,12,20 * * *';

export default saveNewEnMovies;
