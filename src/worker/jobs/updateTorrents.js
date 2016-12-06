/* @flow */

import _ from 'lodash/fp';

import { Movies } from '../../mongo';
import Tpb from '../Tpb';
import Yts from '../Yts';
import type { AgendaContext } from '../';

const updateTorrents = async ({ logger }: AgendaContext) => {
  const yts = new Yts();
  const tpb = new Tpb();

  const updateableMovies = await Movies.getUpdateable();
  logger.debug(`Updating torrents for ${updateableMovies.length} movies`);

  // eslint-disable-next-line no-restricted-syntax
  for (const movie of updateableMovies) {
    try {
      const [tpbTorrents, release] = await Promise.all([
        tpb.getTorrentsForMovie(movie.info.title),
        movie.info.ytsId
          ? yts.getReleaseDetails(movie.info.ytsId)
          : Promise.resolve({}),
      ]);

      if (movie.info.ytsId ? !_.isEmpty(release) : true) {
        await Movies.updateOne(movie._id, {
          torrents: [...(release.torrents || []), ...tpbTorrents],
        });
        logger.info(`Updated torrents for movie "${movie.info.title}"`);
      } else {
        logger.warn(`Failed to get torrents for movie "${movie.title}"`);
      }

      // Let's be good guys
      await new Promise((resolve: () => void) => setTimeout(resolve, 4000));
    } catch (err) {
      logger.error(
        `Failed to update torrents for movie "${movie.info.title}":`,
        err.message,
      );
      logger.verbose(err.stack);
    }
  }
};

updateTorrents.interval = '00 10,22 * * *';

export default updateTorrents;
