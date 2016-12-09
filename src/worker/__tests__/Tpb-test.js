/* @flow */

import { modelFromObject } from '../../test-utils';
import Tpb from '../Tpb';

const query = {
  title: 'Pete\'s Dragon',
  year: 2016,
};

describe('getTpbTorrents', () => {
  let tpb: Tpb;

  beforeAll(() => {
    tpb = new Tpb();
  });

  it('fetches a list of torrents for a given query', async () => {
    const torrents = await tpb.getTorrentsForMovie(query);
    expect(modelFromObject({ torrents })).toMatchSnapshot();
  });

  it('fetches a list of top movies', async () => {
    const movies = await tpb.getTopMovies();
    expect(modelFromObject({ movies })).toMatchSnapshot();
  });
});
