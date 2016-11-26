/* @flow */

import { Movies } from '../../mongo';
import MovieApi from '../MovieApi';
import type { AgendaContext } from '../';

const updateMovieInfo = async ({ logger }: AgendaContext) => {
  const movieApi = new MovieApi();

  const updateableMovies = await Movies.getUpdateable();
  logger.debug(`Updating info for ${updateableMovies.length} movies`);

  // eslint-disable-next-line no-restricted-syntax
  for (const movie of updateableMovies) {
    try {
      const updates = await movieApi.getUpdates(movie.info);

      if (updates) {
        const prevImdbPopularity = movie.info.imdbPopularity;

        if (!updates.imdbPopularity) {
          logger.warn(`No IMDB popularity found for movie ${movie.info.title}`);
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
        logger.info(`Updated info for movie "${movie.info.title}"`);
      } else {
        logger.warn(`Failed to get updates for movie "${movie.title}"`);
      }

      // Let's be good guys
      await new Promise((resolve: () => void) => setTimeout(resolve, 4000));
    } catch (err) {
      logger.error(
        `Failed to update info for movie "${movie.info.title}":`,
        err.message,
      );
      logger.debug(err.stack);
    }
  }
};

updateMovieInfo.interval = '00 18 * * *';

export default updateMovieInfo;
