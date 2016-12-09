/* @flow */

import { Movies } from '../../mongo';
import Torrentino from '../Torrentino';
import Tpb from '../Tpb';
import Yts from '../Yts';
import type { AgendaContext } from '../';

const updateTorrents = async ({ logger }: AgendaContext) => {
  const yts = new Yts();
  const tpb = new Tpb();
  const torrentino = new Torrentino();

  const updateableMovies = await Movies.getUpdateable();
  logger.debug(`Updating torrents for ${updateableMovies.length} movies`);

  // eslint-disable-next-line no-restricted-syntax
  for (const movie of updateableMovies) {
    const {
      title: { en: enTitle, ru: ruTitle },
      torrentinoSlug,
      year,
      ytsId,
    } = movie.info;
    const title: string = ((enTitle || ruTitle): any);

    try {
      const [tpbTorrents, ytsRelease, torrentinoRelease] = await Promise.all([
        enTitle
          ? tpb.getTorrentsForMovie({ title: enTitle, year })
          : Promise.resolve([]),
        ytsId
          ? yts.getReleaseDetails(ytsId)
          : Promise.resolve({}),
        torrentinoSlug
          ? torrentino.getReleaseDetails(torrentinoSlug)
          : Promise.resolve({}),
      ]);

      const enTorrents = [...(ytsRelease.torrents || []), ...tpbTorrents];
      const ruTorrents = torrentinoRelease.torrents || [];

      if (enTitle && enTorrents.length === 0) {
        logger.warn(`Failed to get English torrents for movie "${enTitle}"`);
      }
      if (movie.info.torrentinoSlug && ruTitle && ruTorrents.length === 0) {
        logger.warn(`Failed to get Russian torrents for movie "${ruTitle}"`);
      }

      await Movies.updateOne(movie._id, {
        torrents: {
          en: enTorrents,
          ru: ruTorrents,
        },
      });
      logger.info(`Updated torrents for movie "${title}"`);

      // Let's be good guys
      await new Promise((resolve: () => void) => setTimeout(resolve, 4000));
    } catch (err) {
      logger.error(
        `Failed to update torrents for movie "${title}":`,
        err.message,
      );
      logger.verbose(err.stack);
    }
  }
};

updateTorrents.interval = '00 10,22 * * *';

export default updateTorrents;
