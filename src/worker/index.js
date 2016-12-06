/* @flow */

import { existsSync, readFileSync } from 'fs';
import path from 'path';

import _ from 'lodash/fp';
import Agenda from 'agenda';
import rp from 'request-promise-native';

import { isProduction } from '../env';
import * as jobs from './jobs';
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

const jobDefinitions: Array<JobDefinition> = _.values(jobs);
const jobLoggers = jobDefinitions.reduce((
  loggers: Object,
  jobDef: JobDefinition,
) => ({
  ...loggers,
  [jobDef.name]: new Logger(`job-${jobDef.name}`),
}), {});

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

  jobDefinitions.forEach((jobDef: JobDefinition) => {
    agenda.define(jobDef.name, async (job: AgendaJob, done: () => void) => {
      try {
        await jobDef({ logger: jobLoggers[jobDef.name] });
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
    jobLoggers[jobName].info('Job started');
  });
  agenda.on('success', ({ attrs: { name: jobName } }: AgendaJob) => {
    jobLoggers[jobName].info('Job finished successfully');
    if (healthchecks[jobName]) {
      rp(healthchecks[jobName]);
    }
  });
  agenda.on('fail', (err: Error, { attrs: { name: jobName } }: AgendaJob) => {
    jobLoggers[jobName].error('Job failed:', err.message);
    jobLoggers[jobName].verbose(err.stack);
  });
  agenda.on('ready', async () => {
    if (!isProduction) {
      await db.collection('jobs').deleteMany({});
    }

    agenda.start();
  });
  /* eslint-enable promise/prefer-await-to-callbacks */
})();
