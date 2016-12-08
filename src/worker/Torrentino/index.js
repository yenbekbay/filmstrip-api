/* @flow */

import _ from 'lodash/fp';
import retry from 'async-retry';

import releaseFromRes from './releaseFromRes';
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

        const movieNodes =
          $('.m-right > .showcase > .tiles > .tile[data-movie-id]').get();

        const releases = _.compact(
          movieNodes.map((el: Object) => {
            const torrentinoSlug = _.replace(
              '/movie/', '', $(el).children('a').first().attr('href'),
            );
            const title = $(el).find('a > .title > .name').text();
            const year = parseInt($(el).find('a > .title > .year').text(), 10);
            const kpId = parseInt(_.head(torrentinoSlug.match(/\d+/)), 10);

            if (!torrentinoSlug || !title || !year || !kpId) return null;

            return { torrentinoSlug, kpId, title, year };
          }),
        );

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

  getReleaseDetails = async (slug: string) => {
    const $ = await this._connector.htmlGet(`movie/${slug}`);

    const release = releaseFromRes($, slug);
    if (!release) {
      throw new Error(`Failed to get Torrentino release for movie ${slug}`);
    }

    return release;
  };
}

export default Torrentino;
