/* @flow */

import _ from 'lodash/fp';

const releaseListFromRes = ($: () => Object) => {
  const movieNodes = $(
    '.main > section > .showcase .tiles > .tile[data-movie-id]',
  ).get();

  return _.compact(
    movieNodes.map((el: Object) => {
      const torrentinoSlug = _.replace(
        '/movie/',
        '',
        $(el).children('a').first().attr('href'),
      );
      const title = $(el).find('a > .title > .name').text();
      const year = parseInt($(el).find('a > .title > .year').text(), 10);
      const kpId = parseInt(_.head(torrentinoSlug.match(/\d+/)), 10);

      if (!torrentinoSlug || !title || !year || !kpId) return null;

      return {torrentinoSlug, kpId, title, year};
    }),
  );
};

export default releaseListFromRes;
