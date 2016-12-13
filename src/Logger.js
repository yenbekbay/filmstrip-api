/* @flow */

import { Papertrail } from 'winston-papertrail';
import _ from 'lodash/fp';
import winston from 'winston';

import { isProduction, papertrailHost, papertrailPort } from './env';

export type LogFn = (...data: Array<any>) => void;

const winstonLogger = new winston.Logger({
  rewriters: [
    (level: string, message: string, meta: Object): Object => (
      _.isEmpty(meta.tags)
        ? _.omit(['tags'], meta)
        : meta
    ),
  ],
  transports: _.compact([
    new winston.transports.Console({
      level: 'debug',
      colorize: true,
    }),
    (isProduction && papertrailHost && papertrailPort) && new Papertrail({
      level: 'verbose',
      host: papertrailHost,
      port: papertrailPort,
      hostname: 'filmstrip',
      inlineMeta: true,
      logFormat: (level: string, message: string) => `[${level}] ${message}`,
    }),
  ]),
});

class Logger {
  _source: string;

  constructor(source: string) {
    this._source = source;
  }

  error = (...data: Array<any>) => {
    winstonLogger.error(`[${this._source}]`, ...data);
  };

  warn = (...data: Array<any>) => {
    winstonLogger.warn(`[${this._source}]`, ...data);
  };

  info = (...data: Array<any>) => {
    winstonLogger.info(`[${this._source}]`, ...data);
  };

  verbose = (...data: Array<any>) => {
    winstonLogger.verbose(`[${this._source}]`, ...data);
  };

  debug = (...data: Array<any>) => {
    winstonLogger.debug(`[${this._source}]`, ...data);
  };

  stream = {
    write: (message: string) => {
      this.info(message.trim());
    },
  };
}

export default Logger;
