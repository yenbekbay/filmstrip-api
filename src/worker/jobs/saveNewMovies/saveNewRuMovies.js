/* @flow */

import _ from 'lodash/fp';
import slugify from 'slugify';

import {isProduction} from '../../../env';
import {Movies} from '../../../mongo';
import type {JobContext} from './';

const ensureNewMovie = async (
  {logger, movieApi}: JobContext,
  query: {
    kpId?: ?number,
    title: string,
    year: number,
  },
) => {
  try {
    const tmdbMatch = await movieApi.findMatchOnTmdb({...query});
    const savedMovieByQuery = await Movies.getByQuery({
      $or: _.compact([
        {'info.title.ru': query.title, 'info.year': query.year},
        query.kpId && {'info.kpId': query.kpId},
        tmdbMatch &&
          {
            'info.title.en': tmdbMatch.title,
            'info.year': query.year,
          },
        tmdbMatch && {'info.tmdbId': tmdbMatch.tmdbId},
      ]),
    });
    if (savedMovieByQuery) {
      logger.debug(`Skipping movie "${query.title}"`);
      return null;
    }

    logger.debug(`Saving movie "${query.title}"`);

    return query;
  } catch (err) {
    logger.error(`Failed to check movie "${query.title}":`, err.message);
    logger.verbose(err.stack);

    return null;
  }
};

const newMoviesFromTorrentino = async (context: JobContext) => {
  const {logger, torrentino} = context;

  const releases = await torrentino.getLatestReleases();
  logger.debug(`Got ${releases.length} releases from Torrentino`);

  return _.compact(
    await Promise.all(
      releases.reverse().map(async (
        release: {
          kpId: number,
          title: string,
          torrentinoSlug: string,
          year: number,
        },
      ) => {
        const newMovie = await ensureNewMovie(context, {...release});
        if (!newMovie) return null;

        return {
          ...newMovie,
          kpId: release.kpId,
          torrentinoSlug: release.torrentinoSlug,
        };
      }),
    ),
  );
};

const saveNewRuMovies = async (context: JobContext) => {
  const {logger, torrentino, tpb, movieApi} = context;

  const allMovies = await newMoviesFromTorrentino(context);

  const movies = isProduction ? allMovies : allMovies.slice(0, 2);
  let savedCount = 0;

  // eslint-disable-next-line no-restricted-syntax
  for (const movie of movies) {
    /* eslint-disable no-await-in-loop */
    try {
      const [info, torrentinoRelease] = await Promise.all([
        movieApi.getMovieInfo(movie),
        torrentino.getReleaseDetails(movie.torrentinoSlug),
      ]);

      if (info) {
        const title: string = (info.title.en || info.title.ru: any);
        const year = info.year || movie.year;

        const tpbTorrents = info.title.en
          ? await tpb.getTorrentsForMovie({title: info.title.en, year})
          : [];

        await Movies.insertOne({
          slug: `${slugify(title).toLowerCase()}-${year}`,
          torrents: {
            en: tpbTorrents || [],
            ru: torrentinoRelease.torrents,
          },
          torrentsUpdatedAt: new Date(),
          info: {
            ...info,
            torrentinoSlug: movie.torrentinoSlug,
            year,
          },
          infoUpdatedAt: new Date(),
        });

        logger.info(`Saved movie "${movie.title}"`);
        savedCount += 1;
      } else {
        logger.warn(`Failed to get info for movie "${movie.title}"`);
      }

      // let's be good guys
      await new Promise((resolve: () => void) => setTimeout(resolve, 4000));
    } catch (err) {
      logger.error(`Failed to save movie "${movie.title}":`, err.message);
      logger.verbose(err.stack);
    }
    /* eslint-enable no-await-in-loop */
  }

  logger.info(`Saved ${savedCount} new movies in Russian`);
};

export default saveNewRuMovies;
