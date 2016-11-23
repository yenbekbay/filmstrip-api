/* @flow */

import { modelFromObject } from '../../test-utils';
import getTpbTorrents from '../getTpbTorrents';

const movieTitle = 'Pete\'s Dragon';

describe('getTpbTorrents', () => {
  it('fetches a list of torrents for a given query', async () => {
    const torrents = await getTpbTorrents(movieTitle);
    expect(modelFromObject({ torrents })).toMatchSnapshot();
  });
});
