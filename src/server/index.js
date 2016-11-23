/* @flow */

import { createServer } from 'http';

import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
import { printSchema } from 'graphql/utilities/schemaPrinter';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import type { $Request, $Response } from 'express';

import { isProduction } from '../env';
import { subscriptionManager } from './subscriptions';
import Logger from '../Logger';
import schema from './schema';

const GRAPHQL_PORT = 8080;
const WS_PORT = 8090;
const CORS_PORT = 3000;

const graphQLLogger = new Logger('graphql-server');
const graphQLServer = express();

graphQLServer.use(morgan(
  ':method :url HTTP/:http-version :status - :response-time ms',
  { stream: graphQLLogger.stream },
));

graphQLServer.use(bodyParser.urlencoded({ extended: true }));
graphQLServer.use(bodyParser.json());

graphQLServer.use('/graphql',
  cors({
    origin: isProduction
      ? 'https://filmstrip.yenbekbay.me'
      : `http://localhost:${CORS_PORT}`,
    methods: ['POST'],
  }),
  graphqlExpress((req: $Request) => {
    // Get the query, the same way express-graphql does it
    // https://git.io/vXO1c
    const query = req.query.query || (req.body: any).query;
    if (query && query.length > 2000) {
      // None of our app's queries are this long
      // Probably indicates someone trying to send an overly expensive query
      throw new Error('Query too large');
    }

    return { schema };
  }),
);

if (!isProduction) {
  graphQLServer.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));

  graphQLServer.use('/schema', (req: $Request, res: $Response) => {
    res.set('Content-Type', 'text/plain');
    res.send(printSchema(schema));
  });
}

// eslint-disable-next-line promise/prefer-await-to-callbacks
graphQLServer.listen(GRAPHQL_PORT, (err: ?Error) => {
  if (err) {
    throw err;
  }

  graphQLLogger.info(
    `Server is now running on http://localhost:${GRAPHQL_PORT}/graphql`,
  );
});

const websocketLogger = new Logger('websocket-server');
const websocketServer = createServer(
  (req: http$IncomingMessage, res: http$ServerResponse) => {
    res.writeHead(404);
    res.end();
  },
);

// eslint-disable-next-line promise/prefer-await-to-callbacks
websocketServer.listen(WS_PORT, (err: ?Error) => {
  if (err) {
    throw err;
  }

  websocketLogger.info(
    `Server is now running on http://localhost:${WS_PORT}`,
  );
});

// eslint-disable-next-line no-new
new SubscriptionServer(
  {
    subscriptionManager,
    // the obSubscribe function is called for every new subscription
    // and we use it to set the GraphQL context for this subscription
    onSubscribe: (msg: any, params: Object) => ({ ...params }),
  },
  websocketServer,
);
