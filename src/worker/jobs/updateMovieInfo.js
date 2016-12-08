/* @flow */

import {
  format as formatDate,
  subMonths as subMonthsFromDate,
} from 'date-fns';

import { Movies } from '../../mongo';
import MovieApi from '../MovieApi';
import type { AgendaContext } from '../';

const updateMovieInfo = async ({ logger }: AgendaContext) => {
  const movieApi = new MovieApi();

  const threeMonthsAgo = formatDate(
    subMonthsFromDate(new Date(), 3),
    'YYYY-MM-DD',
  );

  const updateableMovies = await Movies.getUpdateable({
    $or: [
      {
        $and: [
          { 'info.releaseDate': { $gt: threeMonthsAgo } },
          { 'info.imdbPopularity': { $lt: 1000 } },
        ],
      },
      { 'info.imdbPopularity': { $lt: 600 } },
    ],
  });
  logger.debug(`Updating info for ${updateableMovies.length} movies`);

  // eslint-disable-next-line no-restricted-syntax
  for (const movie of updateableMovies) {
    const title: string = ((movie.info.title.en || movie.info.title.ru): any);

    try {
      const updates = await movieApi.getUpdates({
        title,
        year: movie.info.year,
        imdbId: movie.info.imdbId,
        tmdbId: movie.info.tmdbId,
        kpId: movie.info.kpId,
      });

      if (updates) {
        const prevImdbPopularity = movie.info.imdbPopularity;

        if (!updates.imdbPopularity) {
          logger.warn(`No IMDB popularity found for movie ${title}`);
        }

        await Movies.updateOne(movie._id, {
          info: {
            ...movie.info,
            ...updates,
            imdbPopularity: prevImdbPopularity && prevImdbPopularity < 1000
              ? updates.imdbPopularity || prevImdbPopularity
              : updates.imdbPopularity,
          },
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
