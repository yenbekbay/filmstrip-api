/* @flow */

// eslint-disable-next-line import/no-extraneous-dependencies
import inquirer from 'inquirer';

import * as jobs from '../src/worker/jobs';
import Logger from '../src/Logger';

Error.stackTraceLimit = Infinity;

(async () => {
  /* eslint-disable unicorn/no-process-exit, no-console */
  try {
    const { jobName } = await inquirer.prompt([{
      type: 'list',
      name: 'jobName',
      message: 'Which job do you want to run?',
      choices: Object.keys(jobs),
    }]);

    await jobs[jobName]({ logger: new Logger(`job-${jobName}`) });

    process.exit(0);
  } catch (err) {
    console.error(err.message);
    console.log(err.stack);

    process.exit(1);
  }
  /* eslint-enable unicorn/no-process-exit, no-console */
})();
