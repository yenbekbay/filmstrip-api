/* @flow */

import type { Torrent } from '../types';

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
  genres: [String!]!
  imdbId: String!
  originalTitle: String!
  originalLanguage: String
  synopsis: String!
  posterUrl: String
  productionCountries: [String!]!
  releaseDate: String!
  runtime: Int
  title: String!
  tmdbRating: Float!
  tmdbRatingVoteCount: Int!
  imdbRating: Float
  imdbRatingVoteCount: Int
  kpRating: Float
  kpRatingVoteCount: Int
  rtCriticsRating: Int
  rtCriticsRatingVoteCount: Int
  imdbPopularity: Int
  credits: MovieCredits!
  keywords: [String!]!
  youtubeIds: [String!]!
  mpaaRating: String
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
  id: Int!
  slug: String!
  info: MovieInfo!
  torrents: [Torrent!]!
}
`];

const resolvers = {
  Torrent: {
    source: ({ source }: Torrent) => source.replace(' ', '_').toUpperCase(),
  },
};

export { schema, resolvers };
