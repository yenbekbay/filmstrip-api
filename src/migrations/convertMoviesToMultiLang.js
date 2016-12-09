/* @flow */

import _ from 'lodash/fp';
import slugify from 'slugify';

import connector from '../mongo/connector';
import MovieApi from '../worker/MovieApi';
import Tpb from '../worker/Tpb';
import Yts from '../worker/Yts';

const convertMoviesToMultiLang = async () => {
  /* eslint-disable no-console */
  const yts = new Yts();
  const tpb = new Tpb();
  const movieApi = new MovieApi();

  const collection = await connector.getCollection('movies');
  const movies = await collection
    .find({ 'info.title.en': { $exists: false } })
    .toArray();
  let updatedCount = 0;

  console.log(`Got ${movies.length} movies to update`);

  // eslint-disable-next-line no-restricted-syntax
  for (const movie of movies) {
    try {
      const [info, ytsRelease] = await Promise.all([
        movieApi.getMovieInfo({ ...movie.info }),
        movie.info.ytsId
          ? yts.getReleaseDetails(movie.info.ytsId)
          : Promise.resolve({}),
      ]);

      if (info) {
        const title: string = ((info.title.en || info.title.ru): any);
        const year = info.year || ytsRelease.year;

        const tpbTorrents = await tpb.getTorrentsForMovie({ title, year });

        await collection.updateOne(
          { _id: movie._id },
          {
            updatedAt: new Date(),
            slug: `${slugify(title).toLowerCase()}-${year}`,
            torrents: {
              en: [...(ytsRelease.torrents || []), ...tpbTorrents],
            },
            info: {
              ...info,
              year,
              youtubeIds: {
                ...info.youtubeIds,
                en: _.flow(_.compact, _.uniq)(
                  [...(info.youtubeIds.en || []), ytsRelease.youtubeId],
                ),
              },
              ytsId: movie.info.ytsId,
            },
          },
        );

        console.info(`Updated movie "${movie.info.title}"`);
        updatedCount += 1;
      } else {
        console.error(`Failed to get info for movie "${movie.info.title}"`);
      }

      // let's be good guys
      await new Promise((resolve: () => void) => setTimeout(resolve, 4000));
    } catch (err) {
      console.error(
        `Failed to update movie "${movie.info.title}":`,
        err.message,
      );
      console.info(err.stack);
    }
  }

  console.log(`Updated ${updatedCount} movies`);
  /* eslint-enable no-console */
};

export default convertMoviesToMultiLang;
