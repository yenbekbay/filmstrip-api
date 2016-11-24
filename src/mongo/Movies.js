/* @flow */

import _ from 'lodash/fp';
import DataLoader from 'dataloader';

import CacheMap from '../lib/CacheMap';
import connector from './connector';
import type { Movie, FeedType } from '../types';

const getMoviesByYtsId = async (ytsIds: Array<number>) => {
  const collection = await connector.getCollection('movies');
  const docs = await collection.find({ ytsId: { $in: ytsIds } }).toArray();

  return ytsIds.map((ytsId: number) => _.find({ ytsId }, docs));
};

const MoviesByYtsIdLoader = new DataLoader(getMoviesByYtsId, {
  cacheMap: new CacheMap(1000 * 60 * 5), // cache for 5 minutes
});

const getMoviesBySlug = async (slugs: Array<string>) => {
  const collection = await connector.getCollection('movies');
  const docs = await collection.find({ slug: { $in: slugs } }).toArray();

  return slugs.map((slug: string) => _.find({ slug }, docs));
};

const MoviesBySlugLoader = new DataLoader(getMoviesBySlug, {
  cacheMap: new CacheMap(1000 * 60 * 5), // cache for 5 minutes
});

const Movies = {
  getByYtsId: (ytsId: number) => MoviesByYtsIdLoader.load(ytsId),
  getBySlug: (slug: string) => MoviesBySlugLoader.load(slug),
  getAll: async () => {
    const collection = await connector.getCollection('movies');

    return collection.find().sort({ uploadedAt: -1 }).toArray();
  },
  getFeed: async (type: FeedType, offset: number, limit: number) => {
    const collection = await connector.getCollection('movies');

    const query = type === 'LATEST'
      ? {}
      : { 'info.imdbPopularity': { $lt: 1000 } };
    const sort = type === 'LATEST'
      ? { uploadedAt: -1 }
      : { 'info.imdbPopularity': 1 };

    const [count, nodes] = await Promise.all([
      collection.count(query),
      collection
        .find(query)
        .sort(sort)
        .skip(offset)
        .limit(limit)
        .toArray(),
    ]);

    return { count, nodes };
  },
  updateOne: async (id: string, data: Object) => {
    const collection = await connector.getCollection('movies');

    return collection.updateOne(
      { _id: id },
      { $set: { ...data, updatedAt: new Date() } },
    );
  },
  insertAll: async (movies: Array<Movie>) => {
    if (movies.length === 0) return [];

    const collection = await connector.getCollection('movies');

    return movies.length > 1
      ? collection.insertMany(movies)
      : collection.insertOne(movies[0]);
  },
};

export default Movies;
