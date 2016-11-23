/* @flow */

import { makeExecutableSchema } from 'graphql-tools';
import _ from 'lodash/fp';

import {
  schema as mongoSchema,
  resolvers as mongoResolvers,
} from '../mongo/schema';
import { connectionForType, nodesToConnection } from './connection';
import { Movies } from '../mongo';

const rootSchema = [`
type PageInfo {
  hasPreviousPage: Boolean!
  hasNextPage: Boolean!
}

${connectionForType('Movie')}

type Query {
  movie(slug: String!): Movie
  movies(offset: Int, limit: Int): MovieConnection!
}

# type Subscription {}

schema {
  query: Query
  # subscription: Subscription
}
`];

const rootResolvers = {
  Query: {
    movie: async (
      root: mixed, { slug }: { slug: string },
    ) => Movies.getBySlug(slug),
    movies: async (
      root: mixed,
      { offset = 0, limit = 10 }: { offset?: number, limit: number },
    ) => {
      const protectedLimit = Math.min(20, limit < 1 ? 10 : limit);
      const { count, nodes } = await Movies.getPaged(offset, protectedLimit);

      return nodesToConnection({ count, nodes, offset, limit: protectedLimit });
    },
  },
  // Subscription: {},
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
