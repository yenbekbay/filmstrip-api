/* @flow */

export type MovieCastMember = {
  character?: ?string,
  name: string,
  photoUrl: string,
};
export type MovieCrewMember = {
  name: string,
  photoUrl: string,
};
export type MovieCredits = {
  cast: Array<MovieCastMember>,
  crew: {
    directors: Array<MovieCrewMember>,
  },
};
export type MovieInfo = {
  backdropUrl: ?string,
  credits: MovieCredits,
  genres: Array<string>,
  imdbId: string,
  imdbPopularity: ?number,
  imdbRating: number,
  imdbRatingVoteCount: number,
  keywords: Array<string>,
  kpId?: number,
  kpRating?: number,
  kpRatingVoteCount?: number,
  originalTitle: string,
  posterUrl: ?string,
  productionCountries: Array<string>,
  releaseDate: string,
  rtCriticsRating?: number,
  rtCriticsRatingVoteCount?: number,
  runtime: number,
  synopsis: string,
  title: string,
  tmdbId: string,
  tmdbRating: number,
  tmdbRatingVoteCount: number,
  torrentinoSlug?: string,
  youtubeIds: Array<string>,
  ytsId?: number,
};

export type Torrent = {
  magnetLink: string,
  name?: string,
  peers: number,
  quality: '720p' | '1080p',
  seeds: number,
  size: number,
  source: 'The Pirate Bay' | 'YTS',
};

export type YtsRelease = {
  imdbId: string,
  title: string,
  torrents: Array<Torrent>,
  totalSeeds: number,
  uploadedAt: Date,
  year: number,
  youtubeId: string,
  ytsId: number,
};

export type Doc = {
  _id: string,
  createdAt: Date,
  updatedAt: Date,
};
export type Movie = {
  slug: string,
  info: MovieInfo,
  torrents: Array<Torrent>,
};
export type MovieDoc = Doc & Movie;

export type FeedType = 'TRENDING' | 'NEW' | 'LATEST';
