/* @flow */

import {graphqlExpress, graphiqlExpress} from 'graphql-server-express';
import {printSchema} from 'graphql/utilities/schemaPrinter';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import type {$Request, $Response} from 'express';

import {isProduction} from '../env';
import Logger from '../Logger';
import schema from './schema';

const GRAPHQL_PORT = 8080;
const CORS_PORT = 3000;

const graphQLLogger = new Logger('graphql-server');
const graphQLServer = express();

graphQLServer.use(
  morgan(':method :url HTTP/:http-version :status - :response-time ms', {
    stream: graphQLLogger.stream,
  }),
);

graphQLServer.use(bodyParser.urlencoded({extended: true}));
graphQLServer.use(bodyParser.json());

graphQLServer.use(
  '/graphql',
  cors({
    origin: (
      isProduction ? 'https://filmstrip.cf' : `http://localhost:${CORS_PORT}`
    ),
    methods: ['POST'],
  }),
  graphqlExpress((req: $Request) => {
    // get the query, the same way express-graphql does it
    // https://git.io/vXO1c
    const query = req.query.query || (req.body: any).query;
    if (query && query.length > 2000) {
      // none of our app's queries are this long
      // probably indicates someone trying to send an overly expensive query
      throw new Error('Query too large');
    }

    return {schema};
  }),
);

if (!isProduction) {
  graphQLServer.use('/graphiql', graphiqlExpress({endpointURL: '/graphql'}));

  graphQLServer.use('/schema', (req: $Request, res: $Response) => {
    res.set('Content-Type', 'text/plain');
    res.send(printSchema(schema));
  });
}

graphQLServer.listen(GRAPHQL_PORT, (err: ?Error) => {
  if (err) {
    throw err;
  }

  graphQLLogger.info(
    `Server is now running on http://localhost:${GRAPHQL_PORT}/graphql`,
  );
});
