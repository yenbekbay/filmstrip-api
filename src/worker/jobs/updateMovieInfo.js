/* @flow */

import {
  format as formatDate,
  subDays as subDaysFromDate,
  subMonths as subMonthsFromDate,
} from 'date-fns';

import { Movies } from '../../mongo';
import MovieApi from '../MovieApi';
import type { AgendaContext } from '../';

const updateMovieInfo = async ({ logger }: AgendaContext) => {
  const movieApi = new MovieApi();

  const date = new Date();
  const oneDayAgo = subDaysFromDate(date, 1);
  const fourDaysAgo = subDaysFromDate(date, 4);
  const twoMonthsAgo = formatDate(
    subMonthsFromDate(new Date(), 2),
    'YYYY-MM-DD',
  );
  const withTorrentsQuery = {
    $or: [
      { 'torrents.en': { $ne: [] } },
      { 'torrents.ru': { $ne: [] } },
    ],
  };

  const newMovies = await Movies.getNewMoviesToUpdate({
    ...withTorrentsQuery,
    $or: [
      { infoUpdatedAt: { $lt: oneDayAgo } },
      { infoUpdatedAt: { $exists: false } },
    ],
  });
  logger.debug(`Updating info for ${newMovies.length} new movies`);

  const oldMovies = await Movies.getOldMoviesToUpdate({
    ...withTorrentsQuery,
    $or: [
      { infoUpdatedAt: { $lt: fourDaysAgo } },
      { infoUpdatedAt: { $exists: false } },
    ],
  });
  logger.debug(`Updating info for ${oldMovies.length} old movies`);

  const movies = [...newMovies, ...oldMovies];

  // eslint-disable-next-line no-restricted-syntax
  for (const movie of movies) {
    const title: string = ((movie.info.title.en || movie.info.title.ru): any);
    const popularityOnly = !movie.info.releaseDate ||
      movie.info.releaseDate < twoMonthsAgo;

    if (popularityOnly) {
      logger.debug(`Updating only popularity for movie "${title}"`);
    }

    try {
      const updates = await movieApi.getUpdates({
        title,
        year: movie.info.year,
        imdbId: movie.info.imdbId,
        tmdbId: movie.info.tmdbId,
        kpId: movie.info.kpId,
        popularityOnly,
      });

      if (updates) {
        await Movies.updateOne(movie._id, {
          info: {
            ...movie.info,
            ...updates,
          },
          infoUpdatedAt: new Date(),
        });
        logger.info(`Updated info for movie "${title}"`);
      } else {
        logger.warn(`Failed to get updates for movie "${title}"`);
      }

      // Let's be good guys
      await new Promise((resolve: () => void) => setTimeout(resolve, 4000));
    } catch (err) {
      logger.error(
        `Failed to update info for movie "${title}":`,
        err.message,
      );
      logger.verbose(err.stack);
    }
  }
};

updateMovieInfo.interval = '00 18 * * *';

export default updateMovieInfo;
