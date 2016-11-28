/* @flow */

import _ from 'lodash/fp';
import slugify from 'slugify';

import { Movies } from '../../mongo';
import MovieApi from '../MovieApi';
import Tpb from '../Tpb';
import Yts from '../yts';
import type { AgendaContext } from '../';
import type { YtsRelease } from '../../types';

type JobContext = AgendaContext & {
  yts: Yts,
  tpb: Tpb,
  movieApi: MovieApi,
  savingTitles: Array<string>,
};

const ensureNewMovie = async (
  { logger, movieApi, savingTitles }: JobContext,
  { title, year, imdbId }: { title: string, year: number, imdbId: ?string },
): Promise<?{ tmdbId: number, title: string }> => {
  const slug = `${slugify(title).toLowerCase()}-${year}`;

  try {
    const savedMovieBySlug = await Movies.getBySlug(slug);
    if (savedMovieBySlug) {
      logger.debug(`Skipping "${title}" movie`);
      return null;
    }

    const foundMovie = await movieApi.findMovie({ title, year, imdbId });
    if (!foundMovie) return null;

    const savedMovieByTmdbId = await Movies.getByTmdbId(foundMovie.tmdbId);
    if (savedMovieByTmdbId) {
      logger.debug(`Skipping "${foundMovie.title}" movie`);
      return null;
    }

    logger.debug(`Saving "${foundMovie.title}" movie`);

    return foundMovie;
  } catch (err) {
    logger.error(`Failed to check movie "${title}":`, err.message);
    logger.debug(err.stack);

    return null;
  }
};

const newMoviesFromYts = async (context: JobContext) => {
  const { logger, yts } = context;

  const releases = (await yts.getLatestReleases()).reverse();
  logger.debug(`Got ${releases.length} releases from YTS`);

  return _.compact(await Promise.all(
    releases.map(async (release: YtsRelease) => {
      const newMovie = await ensureNewMovie(context, {
        title: release.title,
        year: release.year,
        imdbId: release.imdbId,
      });

      return !newMovie ? null : {
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

  const movies = _.uniqBy('title', await tpb.getTopMovies());
  logger.debug(`Got ${movies.length} movies from The Pirate Bay`);

  return _.compact(await Promise.all(
    movies.map((
      movie: { title: string, year: number },
    ) => ensureNewMovie(context, {
      title: movie.title,
      year: movie.year,
      imdbId: null,
    })),
  ));
};

const saveNewMovies = async (context: AgendaContext) => {
  const yts = new Yts();
  const tpb = new Tpb();
  const movieApi = new MovieApi();

  const jobContext = { ...context, yts, tpb, movieApi, savingTitles: [] };
  const { logger } = context;

  const ytsMovies = await newMoviesFromYts(jobContext);
  const tpbMovies = await newMoviesFromTpb(jobContext);

  // remove duplicates
  const movies = _.uniqBy('title', [...ytsMovies, ...tpbMovies]);
  let savedCount = 0;

  // eslint-disable-next-line no-restricted-syntax
  for (const movie of movies) {
    try {
      const [info, tpbTorrents] = await Promise.all([
        movieApi.getMovieInfo((movie: any)),
        tpb.getTorrentsForMovie(movie.title),
      ]);

      if (info && (tpbTorrents.length > 0 || !!movie.torrents)) {
        const year = info.releaseDate.slice(0, 4);

        await Movies.insertOne({
          createdAt: new Date(),
          updatedAt: new Date(),
          slug: `${slugify(info.title).toLowerCase()}-${year}`,
          torrents: [...(movie.torrents || []), ...tpbTorrents],
          info: {
            ...info,
            ...(movie.ytsId ? { ytsId: movie.ytsId } : {}),
            youtubeIds: _.uniq(_.concat(
              info.youtubeIds,
              movie.youtubeId ? [movie.youtubeId] : [],
            )),
          },
        });

        logger.info(`Saved "${info.title}" movie`);
        savedCount += 1;

        // Let's be good guys
        await new Promise((resolve: () => void) => setTimeout(resolve, 4000));
      } else if (!info) {
        logger.warn(`Failed to get info for movie "${movie.title}"`);
      } else {
        logger.warn(`Failed to get torrents for movie "${movie.title}"`);
      }
    } catch (err) {
      logger.error(`Failed to save movie "${movie.title}":`, err.message);
      logger.debug(err.stack);
    }
  }

  logger.info(`Saved ${savedCount} new movies`);
};

saveNewMovies.interval = '00 04,12,20 * * *';

export default saveNewMovies;
