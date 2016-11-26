/* @flow */

import _ from 'lodash/fp';

import { Movies } from '../../mongo';
import MovieApi from '../MovieApi';
import Tpb from '../Tpb';
import Yts from '../yts';
import type { AgendaContext } from '../';

const updateMovies = async ({ logger }: AgendaContext) => {
  const yts = new Yts();
  const tpb = new Tpb();
  const movieApi = new MovieApi();

  const savedMovies = await Movies.getAll();
  logger.debug(`Got ${savedMovies.length} movies to update`);

  // eslint-disable-next-line no-restricted-syntax
  for (const movie of savedMovies) {
    try {
      const [release, info, tpbTorrents] = await Promise.all([
        yts.getReleaseDetails(movie.ytsId),
        movieApi.getMovieInfo(movie.info),
        tpb.getTorrentsForMovie(movie.info.title),
      ]);

      const prevImdbPopularity = movie.info.imdbPopularity;

      await Movies.updateOne(movie._id, {
        torrents: [...release.torrents, ...tpbTorrents],
        info: {
          ...info,
          imdbPopularity: prevImdbPopularity && prevImdbPopularity < 1000
            ? info.imdbPopularity || prevImdbPopularity
            : info.imdbPopularity,
          youtubeIds: _.uniq(_.concat(info.youtubeIds, [release.youtubeId])),
        },
      });
      logger.info(`Updated movie "${movie.info.title}"`);

      // Let's be good guys
      await new Promise((resolve: () => void) => setTimeout(resolve, 4000));
    } catch (err) {
      logger.error(
        `Failed to update movie "${movie.info.title}":`,
        err.message,
      );
      logger.debug(err.stack);
    }
  }
};

updateMovies.interval = '00 10,22 * * *';

export default updateMovies;
