/* @flow */

import {Movies} from '../mongo';
import MovieApi from '../worker/MovieApi';

const addStills = async () => {
  /* eslint-disable no-console */
  const movieApi = new MovieApi();

  const movies = await Movies.getAllByQuery({
    'info.stills': {$exists: false},
  });
  let updatedCount = 0;

  console.log(`Got ${movies.length} movies to update`);

  // eslint-disable-next-line no-restricted-syntax
  for (const movie of movies) {
    /* eslint-disable no-await-in-loop */
    const title: string = (movie.info.title.en || movie.info.title.ru: any);

    try {
      const kpInfo = await movieApi._getKpInfo(movie.info.kpId);

      await Movies.updateOne(movie._id, {'info.stills': kpInfo.stills || []});

      console.info(`Updated movie "${title}"`);
      updatedCount += 1;

      // let's be good guys
      await new Promise((resolve: () => void) => setTimeout(resolve, 3000));
    } catch (err) {
      console.error(`Failed to update movie "${title}":`, err.message);
      console.info(err.stack);
    }
    /* eslint-enable no-await-in-loop */
  }

  console.log(`Updated ${updatedCount} movies`);
  /* eslint-enable no-console */
};

export default addStills;
