/* @flow */

export type MovieCastMember = {
  character: ?string,
  name: string,
  photoUrl: string,
};
export type MovieCrewMember = {
  name: string,
  photoUrl: string,
};
export type MovieInfo = {
  ytsId?: number,
  imdbId: string,
  tmdbId: string,
  kpId?: number,
  backdropUrl: ?string,
  genres: Array<string>,
  keywords: Array<string>,
  originalTitle: string,
  posterUrl: ?string,
  productionCountries: Array<string>,
  releaseDate: string,
  runtime: number,
  synopsis: string,
  title: string,
  youtubeIds: Array<string>,
  tmdbRating: number,
  tmdbRatingVoteCount: number,
  imdbRating: number,
  imdbRatingVoteCount: number,
  kpRating?: number,
  kpRatingVoteCount?: number,
  rtCriticsRating?: number,
  rtCriticsRatingVoteCount?: number,
  imdbPopularity: ?number,
  credits: {
    cast: Array<MovieCastMember>,
    crew: {
      directors: Array<MovieCrewMember>,
    },
  },
};
export type Torrent = {
  source: 'The Pirate Bay' | 'YTS',
  name?: string,
  size: number,
  seeds: number,
  peers: number,
  quality: '720p' | '1080p',
  magnetLink: string,
};
export type YtsRelease = {
  ytsId: number,
  imdbId: string,
  title: string,
  year: number,
  uploadedAt: Date,
  totalSeeds: number,
  youtubeId: string,
  torrents: Array<Torrent>,
};
export type Movie = {
  _id?: string,
  createdAt: Date,
  updatedAt: Date,
  slug: string,
  info: MovieInfo,
  torrents: Array<Torrent>,
};
export type FeedType = 'LATEST' | 'TRENDING';
