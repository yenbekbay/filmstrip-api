/* @flow */

import _ from 'lodash/fp';
import retry from 'async-retry';

import releaseFromRes from './releaseFromRes';
import releaseListFromRes from './releaseListFromRes';
import TorrentinoConnector from './connector';

class Torrentino {
  _connector = new TorrentinoConnector();

  getLatestReleases = async (
    page: void | number,
  ): Promise<Array<Object>> => retry(
    async (bail: (err: Error) => void) => {
      const currentYear = new Date().getFullYear();
      const noReleasesErrMessage = 'Failed to get latest Torrentino releases';

      try {
        const $ = await this._connector.htmlGet(
          'movies',
          {
            quality: 'hq',
            years: `${currentYear - 1},${currentYear}`,
            sort: 'date',
            page: page || 1,
          },
        );

        const releases = releaseListFromRes($);

        if (releases.length === 0) {
          throw new Error(noReleasesErrMessage);
        }

        return releases;
      } catch (err) {
        if (err.message === noReleasesErrMessage) {
          throw err;
        }

        return bail(err);
      }
    },
    { retries: 5 },
  );

  getReleaseDetails = async (slug: string) => retry(
    async (bail: (err: Error) => void) => {
      const noReleaseErrMessage =
        `Failed to get Torrentino release for movie ${slug}`;

      try {
        const $ = await this._connector.htmlGet(`movie/${slug}`);

        const release = releaseFromRes($, slug);
        if (!release) {
          throw new Error(noReleaseErrMessage);
        }

        return release;
      } catch (err) {
        if (err.message === noReleaseErrMessage) {
          throw err;
        }

        return bail(err);
      }
    },
    { retries: 5 },
  );

  getTorrentinoSlug = async (
    query: { title: string, kpId: number },
  ): Promise<?string> => {
    const $ = await this._connector.htmlGet('search', {
      type: 'movies',
      search: query.title,
    });

    const releases = releaseListFromRes($).filter(
      ({ kpId }: Object) => kpId === query.kpId,
    );

    return _.flow(_.head, _.get('torrentinoSlug'))(releases);
  };
}

export default Torrentino;
