/* @flow */

import { modelFromObject } from '../../test-utils';
import Tpb from '../Tpb';

const movieTitle = 'Pete\'s Dragon';

describe('getTpbTorrents', () => {
  let tpb: Tpb;

  beforeAll(() => {
    tpb = new Tpb();
  });

  it('fetches a list of torrents for a given query', async () => {
    const torrents = await tpb.getTorrentsForMovie(movieTitle);
    expect(modelFromObject({ torrents })).toMatchSnapshot();
  });

  it('fetches a list of top movie titles', async () => {
    const movieTitles = await tpb.getTopMovieTitles();
    expect(modelFromObject({ movieTitles })).toMatchSnapshot();
  });
});
