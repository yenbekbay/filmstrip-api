/* @flow */

import _ from 'lodash/fp';
import slugify from 'slugify';

import { Movies } from '../../mongo';
import getTpbTorrents from '../getTpbTorrents';
import MovieApi from '../MovieApi';
import Yts from '../yts';
import type { AgendaContext } from '../';
import type { Movie } from '../../types';

const saveNewMovies = async ({ logger }: AgendaContext) => {
  const yts = new Yts();
  const movieApi = new MovieApi();

  const releases = await yts.getLatestReleases();
  logger.debug(`Got ${releases.length} releases from YTS`);

  const movies: Array<Movie> = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const release of releases) {
    try {
      logger.debug(`Checking if "${release.title}" movie was already saved`);
      const savedMovie = await Movies.getByYtsId(release.ytsId);

      if (savedMovie) {
        logger.debug(`Skipping "${release.title}" movie`);
      } else {
        const [info, tpbTorrents] = await Promise.all([
          movieApi.getMovieInfo((release: any)),
          getTpbTorrents(release.title),
        ]);

        movies.push({
          createdAt: new Date(),
          updatedAt: new Date(),
          uploadedAt: release.uploadedAt,
          ytsId: release.ytsId,
          slug: `${slugify(info.title).toLowerCase()}-${release.ytsId}`,
          torrents: [...release.torrents, ...tpbTorrents],
          info: {
            ...info,
            youtubeIds: _.uniq(_.concat(info.youtubeIds, [release.youtubeId])),
          },
        });
      }
    } catch (err) {
      logger.error(`Failed to save movie "${release.title}":`, err.message);
      logger.debug(err.stack);
    }
  }

  logger.info(`Saved ${movies.length} new movies`);

  await Movies.insertAll(movies);
};

saveNewMovies.interval = '00 04,12,20 * * *';

export default saveNewMovies;
