/* @flow */

type MultiLanguage<T> = {
  ru?: ?T,
  en?: ?T,
};

export type MovieCastMember = {
  character?: ?string,
  name: string,
  photoUrl: ?string,
};
export type MovieCrewMember = {
  name: string,
  photoUrl: ?string,
};
export type MovieCredits = {
  cast: Array<MovieCastMember>,
  crew: {
    directors: Array<MovieCrewMember>,
  },
};
export type MovieInfo = {
  backdropUrl: ?string,
  credits: MultiLanguage<MovieCredits>,
  genres: MultiLanguage<Array<string>>,
  imdbId: ?string,
  imdbPopularity: ?number,
  imdbRating: ?number,
  imdbRatingVoteCount: ?number,
  keywords: ?Array<string>,
  kpId: ?number,
  kpRating: ?number,
  kpRatingVoteCount: ?number,
  mpaaRating: ?string,
  originalLanguage: ?string,
  originalTitle: ?string,
  posterUrl: MultiLanguage<string>,
  productionCountries: MultiLanguage<Array<string>>,
  releaseDate: ?string,
  rtCriticsRating: ?number,
  rtCriticsRatingVoteCount: ?number,
  runtime: ?number,
  synopsis: MultiLanguage<string>,
  title: MultiLanguage<string>,
  tmdbId: ?number,
  tmdbPopularity: ?number,
  tmdbRating: ?number,
  tmdbRatingVoteCount: ?number,
  torrentinoSlug?: ?string,
  traktSlug: ?string,
  traktWatchers: ?number,
  year: number,
  youtubeIds: MultiLanguage<Array<string>>,
  ytsId?: ?number,
};

export type Torrent = {
  audioTracks?: Array<string>,
  audioTranslationType?: string,
  bundledSubtitles?: Array<string>,
  magnetLink: string,
  name?: string,
  peers: number,
  quality: '720p' | '1080p',
  seeds: number,
  size: number,
  source: 'The Pirate Bay' | 'YTS' | 'Torrentino',
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
export type TorrentinoRelease = {
  info: {
    credits: MovieCredits,
    genres: Array<string>,
    originalTitle: ?string,
    posterUrl: ?string,
    productionCountries: Array<string>,
    releaseDate: ?string,
    runtime: ?number,
    synopsis: ?string,
    title: string,
    torrentinoSlug: string,
    year: number,
  },
  torrents: Array<Torrent>,
};

export type Doc = {
  _id: string,
  createdAt: Date,
  updatedAt: Date,
};
export type Movie = {
  slug: string,
  info: MovieInfo,
  torrents: MultiLanguage<Array<Torrent>>,
};
export type MovieDoc = Doc & Movie;

export type FeedType = 'TRENDING' | 'NEW' | 'LATEST';
