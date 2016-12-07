/* @flow */

// eslint-disable-next-line import/no-extraneous-dependencies
import inquirer from 'inquirer';

import * as migrations from '../src/migrations';

Error.stackTraceLimit = Infinity;

(async () => {
  /* eslint-disable unicorn/no-process-exit, no-console */
  try {
    const { migrationName } = await inquirer.prompt([{
      type: 'list',
      name: 'migrationName',
      message: 'Which migration do you want to run?',
      choices: Object.keys(migrations),
    }]);

    await migrations[migrationName]();

    process.exit(0);
  } catch (err) {
    console.error(err.message);
    console.log(err.stack);

    process.exit(1);
  }
  /* eslint-enable unicorn/no-process-exit, no-console */
})();
