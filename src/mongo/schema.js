/* @flow */

import _ from 'lodash/fp';

import type { MovieInfo, Torrent, MovieDoc } from '../types';

const schema = [`
enum Language {
  EN
  RU
}

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
  imdbPopularity: Int
  imdbRating: Float
  imdbRatingVoteCount: Int
  keywords(lang: Language!): [String!]!
  kpRating: Float
  kpRatingVoteCount: Int
  mpaaRating: String
  originalLanguage: String
  originalTitle: String
  posterUrl(lang: Language!): String
  productionCountries(lang: Language!): [String!]!
  releaseDate: String!
  rtCriticsRating: Int
  rtCriticsRatingVoteCount: Int
  runtime: Int
  synopsis(lang: Language!): String
  title(lang: Language!): String!
  tmdbId: Int
  tmdbRating: Float
  tmdbRatingVoteCount: Int
  torrentinoSlug: String
  youtubeIds(lang: Language!): [String!]!
  ytsId: Int
}

enum TorrentSource {
  THE_PIRATE_BAY
  YTS
}

type Torrent {
  source: TorrentSource!
  name: String
  size: Float!
  seeds: Int!
  peers: Int!
  quality: String!
  magnetLink: String!
}

type Movie {
  id: String!
  slug: String!
  info: MovieInfo!
  torrents: [Torrent!]!
}
`];

const getMultiLangInfoFieldOr = (
  defaultVal: mixed,
  key: string,
  lang: string,
  info: MovieInfo,
) => _.getOr(
  lang === 'EN'
    ? defaultVal
    : getMultiLangInfoFieldOr(defaultVal, key, 'EN', info),
  `${key}.${lang.toLowerCase()}`,
  info,
);

const resolvers = {
  MovieInfo: {
    credits: (info: MovieInfo, { lang }: { lang: string }) =>
      getMultiLangInfoFieldOr(
        { cast: [], crew: { directors: [] } },
        'credits', lang, info,
      ),
    genres: (info: MovieInfo, { lang }: { lang: string }) =>
      getMultiLangInfoFieldOr([], 'genres', lang, info),
    keywords: (info: MovieInfo, { lang }: { lang: string }) =>
      getMultiLangInfoFieldOr([], 'keywords', lang, info),
    posterUrl: (info: MovieInfo, { lang }: { lang: string }) =>
      getMultiLangInfoFieldOr(null, 'posterUrl', lang, info),
    productionCountries: (info: MovieInfo, { lang }: { lang: string }) =>
      getMultiLangInfoFieldOr([], 'productionCountries', lang, info),
    synopsis: (info: MovieInfo, { lang }: { lang: string }) =>
      getMultiLangInfoFieldOr(null, 'synopsis', lang, info),
    title: (info: MovieInfo, { lang }: { lang: string }) =>
      getMultiLangInfoFieldOr(null, 'title', lang, info),
    youtubeIds: (info: MovieInfo, { lang }: { lang: string }) =>
      getMultiLangInfoFieldOr([], 'youtubeIds', lang, info),
  },
  Torrent: {
    source: ({ source }: Torrent) => source.replace(' ', '_').toUpperCase(),
  },
  Movie: {
    id: (movie: MovieDoc) => movie._id,
  },
};

export { schema, resolvers };
