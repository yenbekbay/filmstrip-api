/* @flow */

import {
  subDays as subDaysFromDate,
  subMonths as subMonthsFromDate,
} from 'date-fns';
import _ from 'lodash/fp';
import DataLoader from 'dataloader';

import CacheMap from '../lib/CacheMap';
import connector from './connector';
import type { Movie, FeedType } from '../types';

const getMoviesByTmdbId = async (tmdbIds: Array<number>) => {
  const collection = await connector.getCollection('movies');
  const docs = await collection
    .find({ 'info.tmdbId': { $in: tmdbIds } })
    .toArray();

  return tmdbIds.map(
    (tmdbId: number) => _.find(_.matchesProperty('info.tmdbId', tmdbId), docs),
  );
};

const MoviesByTmdbIdLoader = new DataLoader(getMoviesByTmdbId, {
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

const feedQueryMappings = {
  TRENDING: { 'info.imdbPopularity': { $lt: 600 } },
  NEW: {},
  LATEST: {},
};
const feedSortMappings = {
  TRENDING: { 'info.imdbPopularity': 1 },
  NEW: { 'info.releaseDate': -1 },
  LATEST: { createdAt: -1 },
};

const getMovieFeed = async (hashes: Array<string>) => Promise.all(
  hashes.map(async (hash: string) => {
    const [type, offset, limit] = hash.split(':');

    const collection = await connector.getCollection('movies');

    const [count, nodes] = await Promise.all([
      collection.count(feedQueryMappings[type]),
      collection
        .find(feedQueryMappings[type])
        .sort(feedSortMappings[type])
        .skip(parseInt(offset, 10))
        .limit(parseInt(limit, 10))
        .toArray(),
    ]);

    return { count, nodes };
  }),
);

const MovieFeedLoader = new DataLoader(getMovieFeed, {
  cacheMap: new CacheMap(1000 * 60 * 2), // cache for 2 minutes
  batch: false,
});

const matchOperatorsRegex = /[|\\{}()[\]^$+*?.]/g;
const searchMoviesByQuery = async (queries: Array<string>) => Promise.all(
  queries.map(async (query: string) => {
    const collection = await connector.getCollection('movies');

    const docs = await collection
      .find({
        'info.title': {
          $regex: `.*${query.replace(matchOperatorsRegex, '\\$&')}.*`,
          $options: 'i',
        },
      })
      .toArray();

    return docs;
  }),
);

const MoviesSearchLoader = new DataLoader(searchMoviesByQuery, {
  cacheMap: new CacheMap(1000 * 60 * 30), // cache for 30 minutes
  batch: false,
});

const Movies = {
  getByTmdbId: (tmdbId: number) => MoviesByTmdbIdLoader.load(tmdbId),
  getBySlug: (slug: string) => MoviesBySlugLoader.load(slug),
  getUpdateable: async (query: void | Object) => {
    const collection = await connector.getCollection('movies');

    const date = new Date();
    const dateMonthAgo = subMonthsFromDate(date, 1);
    const dayAgo = subDaysFromDate(date, 0);

    return collection
      .find({
        createdAt: { $gt: dateMonthAgo },
        updatedAt: { $lt: dayAgo },
        ...query,
      })
      .sort({ createdAt: -1 })
      .toArray();
  },
  getFeed: async (type: FeedType, offset: number, limit: number) =>
    MovieFeedLoader.load(`${type}:${offset}:${limit}`),
  updateOne: async (id: string, data: Object) => {
    const collection = await connector.getCollection('movies');

    return collection.updateOne(
      { _id: id },
      { $set: { ...data, updatedAt: new Date() } },
    );
  },
  insertOne: async (movie: Movie) => {
    const collection = await connector.getCollection('movies');

    return collection.insertOne(movie);
  },
  insertAll: async (movies: Array<Movie>) => {
    if (movies.length === 0) return [];

    const collection = await connector.getCollection('movies');

    return movies.length > 1
      ? collection.insertMany(movies)
      : collection.insertOne(movies[0]);
  },
  search: async (query: string) => {
    if (query.length < 3) return [];

    return MoviesSearchLoader.load(query);
  },
};

export default Movies;
