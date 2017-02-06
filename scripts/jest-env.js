/* @flow */

const dotenv = require('dotenv');

if (!('CI' in process.env)) {
  dotenv.config();
}
