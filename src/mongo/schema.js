/* @flow */

import _ from 'lodash/fp';

import languagesEn from '../../data/languages/en.json';
import languagesRu from '../../data/languages/ru.json';
import type {MovieCredits, MovieInfo, Torrent, MovieDoc} from '../types';

const languages = {
  en: languagesEn,
  ru: languagesRu,
};

const schema = [
  `
type MovieCastMember {
  character: String
  name: String!
  photoUrl: String
}

type MovieCrewMember {
  name: String!
  photoUrl: String
}

type MovieCrew {
  directors: [MovieCrewMember!]!
}

type MovieCredits {
  cast: [MovieCastMember!]!
  crew: MovieCrew!
}

type MovieInfo {
  backdropUrl: String
  credits(lang: Language!): MovieCredits!
  genres(lang: Language!): [String!]!
  imdbId: String
  imdbRating: Float
  imdbRatingVoteCount: Int
  keywords: [String!]!
  kpRating: Float
  kpRatingVoteCount: Int
  mpaaRating: String
  originalLanguage(lang: Language!): String
  originalTitle: String
  posterUrl(lang: Language!): String
  productionCountries(lang: Language!): [String!]!
  releaseDate: String
  rtCriticsRating: Int
  rtCriticsRatingVoteCount: Int
  runtime: Int
  stills: [String!]!
  synopsis(lang: Language!): String
  title(lang: Language!): String!
  tmdbId: Int
  tmdbPopularity: Float
  tmdbRating: Float
  tmdbRatingVoteCount: Int
  torrentinoSlug: String
  traktSlug: String
  traktWatchers: Int
  year: Int
  youtubeIds(lang: Language!): [String!]!
  ytsId: Int
}

enum TorrentSource {
  THE_PIRATE_BAY
  YTS
  TORRENTINO
}

type Torrent {
  audioTracks(lang: Language!): [String!]
  audioTranslationType: String
  bundledSubtitles(lang: Language!): [String!]
  magnetLink: String!
  name: String
  peers: Int!
  quality: String!
  seeds: Int!
  size: Float!
  source: TorrentSource!
}

type Movie {
  id: String!
  slug: String!
  info: MovieInfo!
  torrents(lang: Language!): [Torrent!]!
}
`,
];

const getMultiLangInfoField = (
  {
    defaultValue = null,
    key,
    lang,
    info,
  }: {
    defaultValue?: mixed,
    key: string,
    lang: string,
    info: MovieInfo,
  },
) => {
  const fallbackVal = lang === 'EN'
    ? defaultValue
    : getMultiLangInfoField({defaultValue, key, lang: 'EN', info});
  const val = _.get(`${key}.${lang.toLowerCase()}`, info);

  return val && !_.isEqual(val, []) ? val : fallbackVal;
};

const resolvers = {
  MovieCredits: {
    cast: (credits: MovieCredits) => credits.cast.slice(0, 30),
  },
  MovieInfo: {
    credits: (info: MovieInfo, {lang}: {lang: string}) =>
      getMultiLangInfoField({
        defaultValue: {cast: [], crew: {directors: []}},
        key: 'credits',
        lang,
        info,
      }),
    genres: (info: MovieInfo, {lang}: {lang: string}) => getMultiLangInfoField({
      defaultValue: [],
      key: 'genres',
      lang,
      info,
    }),
    originalLanguage: (info: MovieInfo, {lang}: {lang: string}) =>
      info.originalLanguage
        ? languages[lang.toLowerCase()][info.originalLanguage]
        : null,
    posterUrl: (info: MovieInfo, {lang}: {lang: string}) =>
      getMultiLangInfoField({
        key: 'posterUrl',
        lang,
        info,
      }),
    productionCountries: (info: MovieInfo, {lang}: {lang: string}) =>
      getMultiLangInfoField({
        defaultValue: [],
        key: 'productionCountries',
        lang,
        info,
      }),
    synopsis: (info: MovieInfo, {lang}: {lang: string}) =>
      getMultiLangInfoField({
        key: 'synopsis',
        lang,
        info,
      }),
    stills: (info: MovieInfo) => (info.stills || []).slice(0, 20),
    title: (info: MovieInfo, {lang}: {lang: string}) => getMultiLangInfoField({
      key: 'title',
      lang,
      info,
    }),
    youtubeIds: (info: MovieInfo, {lang}: {lang: string}) =>
      getMultiLangInfoField({
        defaultValue: [],
        key: 'youtubeIds',
        lang,
        info,
      }),
  },
  Torrent: {
    audioTracks: ({audioTracks}: Torrent, {lang}: {lang: string}) =>
      audioTracks
        ? _.compact(
            audioTracks.map(
              (audioTrack: string) => languages[lang.toLowerCase()][audioTrack],
            ),
          )
        : null,
    bundledSubtitles: ({bundledSubtitles}: Torrent, {lang}: {lang: string}) =>
      bundledSubtitles
        ? _.compact(
            bundledSubtitles.map(
              (bundledSubtitle: string) =>
                languages[lang.toLowerCase()][bundledSubtitle],
            ),
          )
        : null,
    source: ({source}: Torrent) => source.replace(/ /g, '_').toUpperCase(),
  },
  Movie: {
    id: (movie: MovieDoc) => movie._id,
    torrents: (movie: MovieDoc, {lang}: {lang: string}) =>
      _.flow(
        _.getOr([], `torrents.${lang.toLowerCase()}`),
        _.orderBy(['seeds'], ['desc']),
      )(movie),
  },
};

export {schema, resolvers};
