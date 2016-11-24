/* @flow */

// eslint-disable-next-line import/no-extraneous-dependencies
import inquirer from 'inquirer';

import { saveNewMovies, updateMovies } from '../src/worker/jobs';
import Logger from '../src/Logger';
import type { AgendaContext } from '../src/worker';

Error.stackTraceLimit = Infinity;

const context: AgendaContext = {
  logger: new Logger('worker'),
};

const jobs = {
  [saveNewMovies.name]: saveNewMovies,
  [updateMovies.name]: updateMovies,
};

(async () => {
  /* eslint-disable unicorn/no-process-exit, no-console */
  try {
    const { jobName } = await inquirer.prompt([{
      type: 'list',
      name: 'jobName',
      message: 'Which job do you want to run?',
      choices: Object.keys(jobs),
    }]);

    await jobs[jobName](context);

    process.exit(0);
  } catch (err) {
    console.error(err.message);
    console.log(err.stack);

    process.exit(1);
  }
  /* eslint-enable unicorn/no-process-exit, no-console */
})();
