/* @flow */

import { modelFromObject } from '../../../test-utils';
import Torrentino from '../';

const torrentinoSlug = '854942-jason-bourne';

describe('Torrentino', () => {
  let torrentino: Torrentino;

  beforeAll(() => {
    torrentino = new Torrentino();
  });

  it('fetches a list of latest releases', async () => {
    const torrentinoReleases = await torrentino.getLatestReleases();
    expect(modelFromObject({ torrentinoReleases })).toMatchSnapshot();
  });

  it('fetches release details for a given torrentino slug', async () => {
    const release = await torrentino.getReleaseDetails(torrentinoSlug);
    expect(modelFromObject(release)).toMatchSnapshot();
  });
});
