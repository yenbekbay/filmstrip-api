/* @flow */

import _ from 'lodash/fp';

import connector from '../mongo/connector';

const convertMoviesToMultiLang = async () => {
  const collection = await connector.getCollection('movies');
  const movies = await collection.find().toArray();

  await Promise.all(movies.map(async (movie: Object) => {
    const multiLangInfoUpdate = (key: string) => (
      !_.get(`${key}.en`, movie.info)
        ? { [key]: { en: movie.info[key] } }
        : {}
    );

    await collection.updateOne(
      { _id: movie._id },
      {
        $set: {
          updatedAt: new Date(),
          info: {
            ...movie.info,
            ...multiLangInfoUpdate('credits'),
            ...multiLangInfoUpdate('genres'),
            ...multiLangInfoUpdate('keywords'),
            ...multiLangInfoUpdate('posterUrl'),
            ...multiLangInfoUpdate('productionCountries'),
            ...multiLangInfoUpdate('synopsis'),
            ...multiLangInfoUpdate('title'),
            ...multiLangInfoUpdate('youtubeIds'),
          },
        },
      },
    );
  }));

  // eslint-disable-next-line no-console
  console.log(`Updated ${movies.length} movies`);
};

export default convertMoviesToMultiLang;
