/* @flow */

import { modelFromObject } from '../../../test-utils';
import Torrentino from '../';

const sampleTorrentinoSlug = '854942-jason-bourne';
const sampleSearchQuery = {
  title: 'Бэтмен против Супермена: На заре справедливости',
  kpId: 770631,
};

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
    const release = await torrentino.getReleaseDetails(sampleTorrentinoSlug);
    expect(modelFromObject(release)).toMatchSnapshot();
  });

  it('finds a releases by a given query', async () => {
    const torrentinoSlug =
      await torrentino.getTorrentinoSlug(sampleSearchQuery);
    expect(torrentinoSlug).toMatchSnapshot();
  });
});
