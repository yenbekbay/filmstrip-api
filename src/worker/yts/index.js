/* @flow */

import _ from 'lodash/fp';

import YtsConnector from './connector';
import releaseFromRes from './releaseFromRes';
import type { YtsRelease } from './releaseFromRes';

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

    return _.flow(
      _.getOr([], 'data.movies'),
      _.map(releaseFromRes),
      _.filter(({ totalSeeds }: { totalSeeds: number }) => totalSeeds > 1000),
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
