/* @flow */

import { makeExecutableSchema } from 'graphql-tools';
import _ from 'lodash/fp';

import {
  schema as mongoSchema,
  resolvers as mongoResolvers,
} from '../mongo/schema';
import { connectionForType, nodesToConnection } from './connection';
import { Movies } from '../mongo';
import type { FeedType } from '../types';

const rootSchema = [`
type PageInfo {
  hasPreviousPage: Boolean!
  hasNextPage: Boolean!
}

${connectionForType('Movie')}

enum FeedType {
  NEW
  LATEST
  TRENDING
}

type Query {
  movie(slug: String!): Movie
  feed(
    type: FeedType!,
    genres: [String!]!
    offset: Int,
    limit: Int
  ): MovieConnection!
  search(query: String!): [Movie!]!
  genres: [String!]!
}

# type Subscription {}

schema {
  query: Query
}
`];

const rootResolvers = {
  Query: {
    movie: async (
      root: mixed, { slug }: { slug: string },
    ) => Movies.getBySlug(slug),
    feed: async (
      root: mixed,
      { type, genres, offset = 0, limit = 10 }: {
        type: FeedType,
        genres: Array<string>,
        offset?: number,
        limit: number,
      },
    ) => {
      const protectedLimit = Math.min(20, limit < 1 ? 10 : limit);
      const { count, nodes } = await Movies.getFeed(
        type, genres, offset, protectedLimit,
      );

      return nodesToConnection({ count, nodes, offset, limit: protectedLimit });
    },
    search: async (
      root: mixed, { query }: { query: string },
    ) => Movies.search(query),
    genres: Movies.genres,
  },
};

// Put schema together into one array of schema strings
// and one map of resolvers, like makeExecutableSchema expects
const schema = [...rootSchema, ...mongoSchema];
const resolvers = _.merge(rootResolvers, mongoResolvers);

const executableSchema = makeExecutableSchema({
  typeDefs: schema,
  resolvers,
});

export default executableSchema;
