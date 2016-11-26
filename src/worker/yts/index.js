/* @flow */

import _ from 'lodash/fp';

import YtsConnector from './connector';
import releaseFromRes from './releaseFromRes';
import type { YtsRelease } from '../../types';

const MIN_TOTAL_SEEDS = 700;

class Yts {
  _connector: YtsConnector;

  constructor() {
    this._connector = new YtsConnector();
  }

  getLatestReleases = async (): Promise<Array<YtsRelease>> => {
    const res = await this._connector.apiGet(
      'list_movies.json',
      {
        quality: '1080p',
        limit: 50,
      },
    );
    const currentYear = new Date().getFullYear();

    return _.flow(
      _.getOr([], 'data.movies'),
      _.map(releaseFromRes),
      _.filter(
        ({ year, totalSeeds }: YtsRelease) => (
          year >= currentYear - 1 && totalSeeds > MIN_TOTAL_SEEDS
        ),
      ),
      _.orderBy(['uploadedAt', 'totalSeeds'], ['desc', 'desc']),
    )(res);
  };

  getReleaseDetails = async (movieId: number): Promise<YtsRelease> => {
    const res = await this._connector.apiGet(
      'movie_details.json',
      { movie_id: movieId },
    );

    return _.flow(
      _.get('data.movie'),
      (movie: ?Object) => {
        if (!movie) {
          throw new Error(`Failed to get YTS release for movie id ${movieId}`);
        }

        return releaseFromRes(movie);
      },
    )(res);
  };
}

export default Yts;
