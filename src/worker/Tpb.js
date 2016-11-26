/* @flow */

import _ from 'lodash/fp';
import bytes from 'bytes';
import PirateBay from 'thepiratebay';

import type { Torrent } from '../types';

const bytesInGb = 1024 ** 3;
const gbToBytes = _.memoize((gb: number) => bytesInGb * gb);

const tpbSearchOptions = {
  category: 207,
  orderBy: 'seeds',
  sortBy: 'desc',
};

class Tpb {
  getTorrentsForMovie = async (
    movieTitle: string,
  ): Promise<Array<Torrent>> => {
    const sanitizedMovieTitle = movieTitle.replace('\'s', '');
    try {
      const results = await PirateBay.search(
        `${sanitizedMovieTitle} 1080p|720p -HC`,
        tpbSearchOptions,
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
        _.filter(_.cond([
          [
            ({ quality }: Torrent) => _.eq('720p', quality),
            ({ size }: Torrent) => size > gbToBytes(1) && size < gbToBytes(3),
          ],
          [
            ({ quality }: Torrent) => _.eq('1080p', quality),
            ({ size }: Torrent) => size > gbToBytes(2) && size < gbToBytes(5),
          ],
          [_.stubTrue, _.stubFalse],
        ])),
        _.uniqBy('quality'),
      )(results);
    } catch (err) {
      if (_.includes('ECONNRESET', err.message)) {
        return this.getTorrentsForMovie(movieTitle);
      }

      throw err;
    }
  };

  getTopMovies = async () => {
    const currentYear = new Date().getFullYear();

    try {
      const results = await PirateBay.search(
        `${currentYear} 1080p|720p -HC`,
        tpbSearchOptions,
      );

      return _.flow(
        _.map(_.flow(
          _.get('name'),
          (name: string) => _.nth(1, name.match(/(.*)\(?2016\)?/)),
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
