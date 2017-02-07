/* @flow */

import _ from 'lodash/fp';

import type {Torrent} from '../types';

const HD_SIZE_RANGE = [1, 7];
const FULLHD_SIZE_RANGE = [2, 9];

const bytesInGb = 1024 ** 3;
const gbToBytes = _.memoize((gb: number) => bytesInGb * gb);

const torrentQualityTest = _.cond([
  [
    ({quality}: Torrent) => _.eq('720p', quality),
    ({size}: Torrent) =>
      size > gbToBytes(HD_SIZE_RANGE[0]) && size < gbToBytes(HD_SIZE_RANGE[1]),
  ],
  [
    ({quality}: Torrent) => _.eq('1080p', quality),
    ({size}: Torrent) =>
      size > gbToBytes(FULLHD_SIZE_RANGE[0]) &&
        size < gbToBytes(FULLHD_SIZE_RANGE[1]),
  ],
  [_.stubTrue, _.stubFalse],
]);

export {torrentQualityTest};
