/* @flow */

import _ from 'lodash/fp';

import languagesEn from '../../data/languages/en.json';
import languagesRu from '../../data/languages/ru.json';
import type { MovieInfo, Torrent, MovieDoc } from '../types';

const languages = {
  en: languagesEn,
  ru: languagesRu,
};

const schema = [`
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
`];

const getMultiLangInfoFieldOr = (
  defaultVal: mixed,
  key: string,
  lang: string,
  info: MovieInfo,
) => {
  const fallbackVal = lang === 'EN'
    ? defaultVal
    : getMultiLangInfoFieldOr(defaultVal, key, 'EN', info);
  const val = _.get(`${key}.${lang.toLowerCase()}`, info);

  return val && !_.isEqual(val, []) ? val : fallbackVal;
};

const resolvers = {
  MovieInfo: {
    credits: (info: MovieInfo, { lang }: { lang: string }) =>
      getMultiLangInfoFieldOr(
        { cast: [], crew: { directors: [] } },
        'credits', lang, info,
      ),
    genres: (info: MovieInfo, { lang }: { lang: string }) =>
      getMultiLangInfoFieldOr([], 'genres', lang, info),
    originalLanguage: (info: MovieInfo, { lang }: { lang: string }) => (
      info.originalLanguage
        ? languages[lang.toLowerCase()][info.originalLanguage]
        : null
    ),
    posterUrl: (info: MovieInfo, { lang }: { lang: string }) =>
      getMultiLangInfoFieldOr(null, 'posterUrl', lang, info),
    productionCountries: (info: MovieInfo, { lang }: { lang: string }) =>
      getMultiLangInfoFieldOr([], 'productionCountries', lang, info),
    synopsis: (info: MovieInfo, { lang }: { lang: string }) =>
      getMultiLangInfoFieldOr(null, 'synopsis', lang, info),
    stills: (info: MovieInfo) => (info.stills || []).slice(0, 20),
    title: (info: MovieInfo, { lang }: { lang: string }) =>
      getMultiLangInfoFieldOr(null, 'title', lang, info),
    youtubeIds: (info: MovieInfo, { lang }: { lang: string }) =>
      getMultiLangInfoFieldOr([], 'youtubeIds', lang, info),
  },
  Torrent: {
    audioTracks: ({ audioTracks }: Torrent, { lang }: { lang: string }) => (
      audioTracks
        ? audioTracks.map((audioTrack: string) =>
            languages[lang.toLowerCase()][audioTrack],
          )
        : null
    ),
    bundledSubtitles: (
      { bundledSubtitles }: Torrent, { lang }: { lang: string },
    ) => (
      bundledSubtitles
        ? bundledSubtitles.map((bundledSubtitle: string) =>
            languages[lang.toLowerCase()][bundledSubtitle],
          )
        : null
    ),
    source: ({ source }: Torrent) => source.replace(/ /g, '_').toUpperCase(),
  },
  Movie: {
    id: (movie: MovieDoc) => movie._id,
    torrents: (movie: MovieDoc, { lang }: { lang: string }) =>
      _.getOr([], `torrents.${lang.toLowerCase()}`, movie),
  },
};

export { schema, resolvers };
