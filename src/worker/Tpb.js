/* @flow */

import _ from 'lodash/fp';
import bytes from 'bytes';
import PirateBay from 'thepiratebay';
import retry from 'async-retry';

import { torrentQualityTest } from './utils';
import type { Torrent } from '../types';

const HD_MOVIES_CATEGORY = 207;
const MAX_TORRENTS = 5;
const blacklistedUploaders = [
  'jXTENZ8',
];

class Tpb {
  getTorrentsForMovie = async (
    query: { title: string, year: number },
  ): Promise<Array<Torrent>> => retry(
    async (bail: (err: Error) => void) => {
      const { title, year } = query;
      const sanitizedMovieTitle = title.replace('\'s', '');

      try {
        const results = await PirateBay.search(
          `${sanitizedMovieTitle} ${year} 1080p|720p -HC`,
          {
            category: HD_MOVIES_CATEGORY,
            orderBy: 'seeds',
            sortBy: 'desc',
          },
        );

        return _.flow(
          _.map(({ name, size, seeders, leechers, magnetLink }: {
            name: string,
            size: string,
            seeders: string,
            leechers: string,
            magnetLink: string,
          }): Torrent => ({
            source: 'The Pirate Bay',
            name,
            size: bytes(size.replace(/\s+/, '').replace('i', '')),
            seeds: parseInt(seeders, 10),
            peers: parseInt(leechers, 10),
            quality: _.cond([
              [_.includes('720p'), _.constant('720p')],
              [_.includes('1080p'), _.constant('1080p')],
              [_.stubTrue, _.constant(null)],
            ])(name),
            magnetLink,
          })),
          _.filter(_.overEvery([
            torrentQualityTest,
            ({ seeds }: Torrent) => seeds > 10,
          ])),
          _.slice(0, MAX_TORRENTS),
        )(results);
      } catch (err) {
        if (_.includes('ECONNRESET', err.message)) {
          throw err;
        }

        return bail(err);
      }
    },
    { retries: 5 },
  );

  getTopMovies = async () => {
    const currentYear = new Date().getFullYear();

    try {
      const results = await PirateBay.topTorrents(HD_MOVIES_CATEGORY);

      return _.flow(
        _.filter(
          ({ name, uploader }: Object) =>
            _.includes(currentYear, name) &&
            !_.includes('HC', name) &&
            !_.includes(uploader, blacklistedUploaders),
        ),
        _.map(_.flow(
          _.get('name'),
          (name: string) => _.nth(
            1, name.match(new RegExp(`(.*)\\(?${currentYear}\\)?`)),
          ),
          _.replace(/\($/, ''),
          _.replace(/\./g, ' '),
          _.replace(/\s+/g, ' '),
          _.split('/'),
          _.head,
          _.trim,
        )),
        _.uniq,
        _.map((title: string) => ({
          title,
          year: currentYear,
        })),
      )(results);
    } catch (err) {
      if (_.includes('ECONNRESET', err.message)) {
        return this.getTopMovies();
      }

      throw err;
    }
  };
}

export default Tpb;
