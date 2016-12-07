/* @flow */

import _ from 'lodash/fp';

import releaseFromRes from './releaseFromRes';
import TorrentinoConnector from './connector';

class Torrentino {
  _connector = new TorrentinoConnector();

  getLatestReleases = async (page: void | number): Promise<Array<Object>> => {
    const currentYear = new Date().getFullYear();

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

    return _.compact(
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
  };

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
