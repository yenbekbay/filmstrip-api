/* @flow */

import _ from 'lodash/fp';

import type { Torrent } from '../types';

const bytesInGb = 1024 ** 3;
const gbToBytes = _.memoize((gb: number) => bytesInGb * gb);

const torrentQualityTest = _.cond([
  [
    ({ quality }: Torrent) => _.eq('720p', quality),
    ({ size }: Torrent) => size > gbToBytes(1) && size < gbToBytes(4),
  ],
  [
    ({ quality }: Torrent) => _.eq('1080p', quality),
    ({ size }: Torrent) => size > gbToBytes(2) && size < gbToBytes(5),
  ],
  [_.stubTrue, _.stubFalse],
]);

 // eslint-disable-next-line import/prefer-default-export
export { torrentQualityTest };
