/* @flow */

import { subDays as subDaysFromDate } from 'date-fns';

import { Movies } from '../../mongo';
import Torrentino from '../Torrentino';
import Tpb from '../Tpb';
import Yts from '../Yts';
import type { AgendaContext } from '../';

const updateTorrents = async ({ logger }: AgendaContext) => {
  const yts = new Yts();
  const tpb = new Tpb();
  const torrentino = new Torrentino();

  const date = new Date();
  const oneDayAgo = subDaysFromDate(date, 1);
  const fourDaysAgo = subDaysFromDate(date, 4);

  const newMovies = await Movies.getNewMoviesToUpdate({
    $or: [
      { torrentsUpdatedAt: { $lt: oneDayAgo } },
      { torrentsUpdatedAt: { $exists: false } },
    ],
  });
  logger.debug(`Updating torrents for ${newMovies.length} new movies`);

  const oldMovies = await Movies.getOldMoviesToUpdate({
    $or: [
      { torrentsUpdatedAt: { $lt: fourDaysAgo } },
      { torrentsUpdatedAt: { $exists: false } },
    ],
  });
  logger.debug(`Updating torrents for ${oldMovies.length} old movies`);

  const movies = [...newMovies, ...oldMovies];

  // eslint-disable-next-line no-restricted-syntax
  for (const movie of movies) {
    /* eslint-disable no-await-in-loop */
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
        torrentsUpdatedAt: new Date(),
      });
      logger.info(`Updated torrents for movie "${title}"`);

      // Let's be good guys
      await new Promise((resolve: () => void) => setTimeout(resolve, 3000));
    } catch (err) {
      logger.error(
        `Failed to update torrents for movie "${title}":`,
        err.message,
      );
      logger.verbose(err.stack);
    }
    /* eslint-enable no-await-in-loop */
  }
};

updateTorrents.interval = '00 10,22 * * *';

export default updateTorrents;
