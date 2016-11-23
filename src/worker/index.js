/* @flow */

import { existsSync, readFileSync } from 'fs';
import path from 'path';

import Agenda from 'agenda';
import rp from 'request-promise-native';

import { isProduction } from '../env';
import { saveNewMovies, updateMovies } from './jobs';
import connector from '../mongo/connector';
import Logger from '../Logger';

export type AgendaContext = {
  logger: Logger,
};

type JobDefinition = {
  (context: AgendaContext): Promise<void>,
  name: string,
  interval: string,
};
type AgendaJob = {
  attrs: {
    name: string,
  },
};

const context: AgendaContext = {
  logger: new Logger('worker'),
};
const { logger } = context;
const jobDefinitions: Array<JobDefinition> = [saveNewMovies, updateMovies];

(async () => {
  const db = await connector.getDb();

  /* eslint-disable promise/prefer-await-to-callbacks */
  const agenda = new Agenda({
    processEvery: '3 minutes',
    collection: 'jobs',
  }).mongo(db, 'jobs', (err: ?Error) => {
    if (err) {
      throw new Error(`Failed to connect to agenda jobs: ${err.message}`);
    }
  });

  const runJob = (jobName: string) => new Promise((
    resolve: () => void,
    reject: (err: Error) => void,
  ) => {
    agenda.create(jobName).run((err: ?Error) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  jobDefinitions.forEach((jobDef: JobDefinition) => {
    agenda.define(jobDef.name, async (job: AgendaJob, done: () => void) => {
      try {
        await jobDef(context);
        done();
      } catch (err) {
        done(err);
      }
    });

    if (isProduction) {
      agenda.every(
        jobDef.interval,
        jobDef.name,
        null, { timezone: 'Asia/Almaty' },
      );
    }
  });

  const healthchecksPath = path.join(__dirname, '../../healthchecks.json');
  const healthchecks: {
    [jobName: string]: ?string,
  } = existsSync(healthchecksPath)
    ? JSON.parse(readFileSync(healthchecksPath, 'utf8'))
    : {};

  agenda.on('start', ({ attrs: { name: jobName } }: AgendaJob) => {
    logger.info(`Job "${jobName}" started`);
  });
  agenda.on('success', ({ attrs: { name: jobName } }: AgendaJob) => {
    logger.info(`Job "${jobName}" finished successfully`);
    if (healthchecks[jobName]) {
      rp(healthchecks[jobName]);
    }
  });
  agenda.on('fail', (err: Error, { attrs: { name: jobName } }: AgendaJob) => {
    logger.error(`Job "${jobName}" failed`, err.message);
    logger.debug(err.stack);
  });
  agenda.on('ready', async () => {
    if (isProduction) {
      agenda.start();
    } else {
      await db.collection('jobs').deleteMany({});
      await runJob(saveNewMovies.name);
      await runJob(updateMovies.name);
    }
  });
  /* eslint-enable promise/prefer-await-to-callbacks */
})();
