/* @flow */

import {format as formatDate, subMonths as subMonthsFromDate} from 'date-fns';
import _ from 'lodash/fp';
import DataLoader from 'dataloader';

import CacheMap from '../lib/CacheMap';
import connector from './connector';
import type {Movie, MovieDoc, FeedType} from '../types';

const getMovieBySlug = async (slugs: Array<string>) => {
  const collection = await connector.getCollection('movies');
  const docs = await collection.find({slug: {$in: slugs}}).toArray();

  return slugs.map((slug: string) => _.find({slug}, docs));
};

const MovieBySlugLoader = new DataLoader(getMovieBySlug, {cache: false});

const feedQueryMappings = {
  TRENDING: {},
  NEW: {},
  LATEST: {},
};
const feedSortMappings = {
  TRENDING: {'info.traktWatchers': -1},
  NEW: {'info.releaseDate': -1},
  LATEST: {createdAt: -1},
};

const getMovieFeed = async (hashes: Array<string>) => Promise.all(
  hashes.map(async (hash: string) => {
    const {type, lang, genres, offset, limit} = JSON.parse(hash);

    const query = {
      ...feedQueryMappings[type],
      ...(genres.length > 0 ? {[`info.genres.${lang}`]: {$all: genres}} : {}),
      [`torrents.${lang}`]: {$exists: true, $ne: []},
    };

    const collection = await connector.getCollection('movies');

    const [count, nodes] = await Promise.all([
      collection.count(query),
      collection
        .find(query)
        .sort(feedSortMappings[type])
        .skip(offset)
        .limit(limit)
        .toArray(),
    ]);

    return {count, nodes};
  }),
);

const MovieFeedLoader = new DataLoader(getMovieFeed, {
  cacheMap: new CacheMap(1000 * 60 * 2), // cache for 2 minutes
  batch: false,
});

const searchMoviesByQuery = async (hashes: Array<string>) => Promise.all(
  hashes.map(async (hash: string) => {
    const {query, lang} = JSON.parse(hash);
    const collection = await connector.getCollection('movies');

    const docs = await collection
      .find({
        [`info.title.${lang}`]: {
          $regex: `.*${_.escapeRegExp(query)}.*`,
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

const getMovieGenres = async (langs: Array<string>) => Promise.all(
  langs.map(async (lang: string) => {
    const collection = await connector.getCollection('movies');
    const genres = await collection.distinct(`info.genres.${lang}`, {
      [`torrents.${lang}`]: {$exists: true, $ne: []},
    });

    return (genres || []).sort();
  }),
);

const MovieGenresLoader = new DataLoader(getMovieGenres, {
  cacheMap: new CacheMap(1000 * 60 * 30), // cache for 30 minutes
  batch: false,
});

type Feed = {
  count: number,
  nodes: Array<MovieDoc>,
};

const Movies = {
  getBySlug: (slug: string): Promise<?MovieDoc> => MovieBySlugLoader.load(slug),
  getByQuery: async (query: {[key: string]: mixed}): Promise<?MovieDoc> => {
    const collection = await connector.getCollection('movies');

    return collection.findOne(query);
  },
  getAllByQuery: async (
    query: {[key: string]: mixed},
  ): Promise<Array<MovieDoc>> => {
    const collection = await connector.getCollection('movies');

    return collection.find(query).toArray();
  },
  getNewMoviesToUpdate: async (
    query: void | Object,
  ): Promise<Array<MovieDoc>> => {
    const sixMonthsAgo = formatDate(
      subMonthsFromDate(new Date(), 6),
      'YYYY-MM-DD',
    );

    return Movies.getAllByQuery({
      $and: [
        {
          $or: [
            {'info.releaseDate': {$gt: sixMonthsAgo}},
            {'info.traktWatchers': {$gte: 15}},
          ],
        },
        query || {},
      ],
    });
  },
  getOldMoviesToUpdate: async (
    query: void | Object,
  ): Promise<Array<MovieDoc>> => {
    const sixMonthsAgo = formatDate(
      subMonthsFromDate(new Date(), 6),
      'YYYY-MM-DD',
    );

    const docs = await Movies.getAllByQuery({
      $and: [
        {
          'info.releaseDate': {$lte: sixMonthsAgo},
          'info.traktWatchers': {$lt: 15},
        },
        query || {},
      ],
    });

    return _.flow(_.shuffle, _.slice(0, 40))(docs);
  },
  getFeed: async (
    {type, lang, genres, offset, limit}: {
      type: FeedType,
      lang: string,
      genres: Array<string>,
      offset: number,
      limit: number,
    },
  ): Promise<Feed> =>
    MovieFeedLoader.load(
      JSON.stringify({
        type,
        lang: lang.toLowerCase(),
        genres,
        offset,
        limit,
      }),
    ),
  updateOne: async (id: string, data: Object) => {
    const collection = await connector.getCollection('movies');

    return collection.updateOne({_id: id}, {
      $set: {...data, updatedAt: new Date()},
    });
  },
  insertOne: async (movie: Movie) => {
    const collection = await connector.getCollection('movies');

    return collection.insertOne({
      ...movie,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  },
  insertAll: async (movies: Array<Movie>) => {
    if (movies.length === 0) return [];

    const collection = await connector.getCollection('movies');

    return collection.insertMany(
      movies.map((movie: Movie) => ({
        ...movie,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
  },
  search: async (query: string, lang: string): Promise<Array<MovieDoc>> => {
    if (query.length < 3) return [];

    return MoviesSearchLoader.load(
      JSON.stringify({
        query,
        lang: lang.toLowerCase(),
      }),
    );
  },
  genres: async (lang: string): Promise<Array<string>> =>
    MovieGenresLoader.load(lang.toLowerCase()),
};

export default Movies;
