/* @flow */

import _ from 'lodash/fp';
import bytes from 'bytes';

import { torrentQualityTest } from '../utils';
import type { TorrentinoRelease } from '../../types';

const separatorRegex = /\s*,\s*|\s+/;
const validAudioTranslationTypes = [
  'Лицензия',
  'Дублированный',
  'Профессиональный многоголосый',
];

const movieInfoFromRes = ($: () => Object) => {
  const headNode = $('.m-right > .entity > .head-plate > .head');
  const detailsNode = headNode.find('.specialty');

  const title = headNode.find('.header-group > h1').text() || null;
  const year = parseInt(
    detailsNode.find('tr.clause td:contains("Год") ~ td').text(), 10,
  );

  if (!title || !year) return null;

  const posterUrl = headNode.find('.cover > img').attr('src') || null;
  const originalTitle = headNode.find('.header-group > h2').text() || null;
  const synopsis = detailsNode.children('p').text() || null;
  const [hours, minutes] = _.split(
    ':',
    detailsNode.find('tr.clause td:contains("Длительность") ~ td').text(),
  );
  const runtime = (parseInt(hours, 10) * 60) + (parseInt(minutes, 10) * 60);
  const productionCountries = _.flow(
    _.split(','),
    _.map(_.flow(
      _.trim,
      _.capitalize,
      _.replace('Сша', 'США'),
    )),
  )(detailsNode.find('tr.clause td:contains("Страна") ~ td').text());
  const genres = _.flow(
    _.split(','),
    _.map(_.trim),
  )(detailsNode.find('tr.clause td:contains("Жанр") ~ td').text());
  const releaseDate = _.flow(
    _.split('/'),
    ([dateDay, dateMonth, dateYear]: Array<?string>) => (
      (dateDay && dateMonth && dateYear)
        ? [dateYear, dateMonth, dateDay].join('-')
        : null
    ),
  )(detailsNode.find('tr.clause td:contains("Премьера в РФ") ~ td').text());

  const creditsForJob = (job: string) => _.flow(
    _.split(','),
    _.map(_.flow(
      _.trim,
      (name: ?string) => (
        name ? { name, photoUrl: null } : null
      ),
    )),
    _.compact,
  )(detailsNode.find(`tr.clause td:contains("${job}") ~ td`).text());

  const directors = creditsForJob('Режиссер');
  const cast = creditsForJob('В ролях');

  return {
    title,
    originalTitle,
    posterUrl,
    synopsis,
    year,
    runtime,
    productionCountries,
    genres,
    releaseDate,
    credits: {
      cast,
      crew: {
        directors,
      },
    },
  };
};

const torrentsFromRes = ($: () => Object) =>
  $('.main > section > .entity > .list-start > .table-list')
    .first()
    .find('tr.item')
    .get()
    .map((el: Object) => {
      const quality = _.flow(
        _.split('x'),
        _.head,
        (videoWidth: ?string) => (videoWidth ? parseInt(videoWidth, 10) : null),
        _.cond([
          [_.gt(_, 1900), _.constant('1080p')],
          [_.gt(_, 1000), _.constant('720p')],
          [_.stubTrue, _.constant('SD')],
        ]),
      )($(el).children('.video').text() || null);

      const audioTranslationType = _.flow(
        (audio: ?string) => (audio === '.  .' ? null : audio),
      )($(el).children('.audio').text() || null);
      const audioTracks = _.flow(
        _.split(separatorRegex),
        _.map((language: string) => (language === 'null' ? null : language)),
        _.compact,
      )($(el).children('.languages').text());
      const bundledSubtitles = _.flow(
        _.split(separatorRegex),
        _.compact,
      )($(el).children('.subtitles').text());
      const size = _.flow(
        (sizeInGb: string) => (
          _.includes('ГБ', sizeInGb)
            ? bytes(sizeInGb.replace(/\s+/, '').replace('ГБ', 'GB'))
            : NaN
        ),
      )($(el).children('.size').text());
      const seeds = parseInt($(el).find('.seed-leech > .seed').text(), 10);
      const peers = parseInt($(el).find('.seed-leech > .leech').text(), 10);
      const magnetLink = $(el).find('.download > a').attr('data-default');

      return (
        quality !== 'SD' &&
        audioTranslationType &&
        _.includes('ru', audioTracks) &&
        _.includes(audioTranslationType, validAudioTranslationTypes) &&
        !!size && seeds > 0 && peers > 0 && _.startsWith('magnet:?', magnetLink)
      ) ? {
        source: 'Torrentino',
        quality,
        audioTranslationType,
        audioTracks,
        bundledSubtitles,
        size,
        seeds,
        peers,
        magnetLink,
      } : null;
    });

const releaseFromRes = (
  $: () => Object,
  torrentinoSlug: string,
): ?TorrentinoRelease => {
  const movieInfo = movieInfoFromRes($);
  if (!movieInfo) return null;

  const torrents = torrentsFromRes($) || [];

  return {
    info: {
      ...movieInfo,
      kpId: parseInt(_.head(torrentinoSlug.match(/\d+/)), 10),
      torrentinoSlug,
    },
    torrents: _.flow(
      _.compact,
      _.filter(torrentQualityTest),
      _.orderBy(['seeds'], ['desc']),
    )(torrents),
  };
};

export default releaseFromRes;
