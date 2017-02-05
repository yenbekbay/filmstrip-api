/* @flow */

import {modelFromObject} from '../../test-utils';
import MovieApi from '../MovieApi';

describe('MovieApi', () => {
  let movieApi: MovieApi;

  beforeAll(() => {
    movieApi = new MovieApi();
  });

  it(
    'fetches movie info for a given query',
    async () => {
      const movieInfo = await movieApi.getMovieInfo({
        title: 'Star Wars: The Force Awakens',
        year: 2015,
        imdbId: 'tt2488496',
      });
      expect(modelFromObject(movieInfo)).toMatchSnapshot();
    },
    15000,
  );
});
