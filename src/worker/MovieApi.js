/* @flow */

import { Tmdb, Imdb, Kinopoisk, Trakt } from 'movie-api';
import _ from 'lodash/fp';

import { tmdbApiKey, imdbUserId, traktApiKey } from '../env';
import type { MovieCredits, MovieInfo } from '../types';

const trailersFromTmdbVideos = (videos: Array<Object>) => _.flow(
  _.filter(({ type, site }: Object) => (
    type === 'Trailer' && site === 'YouTube'
  )),
  _.map('key'),
)(videos);

type Query = {
  title: string,
  year: number,
  imdbId?: ?string,
  tmdbId?: ?number,
  kpId?: ?number,
  traktSlug?: ?string,
};

class MovieApi {
  _tmdb = new Tmdb({
    apiKey: tmdbApiKey,
    language: 'en',
  });
  _imdb = new Imdb({
    userId: imdbUserId,
  });
  _kp = new Kinopoisk();
  _trakt = new Trakt({
    apiKey: traktApiKey,
  });

  _getTmdbId = async (query: Query) => {
    if (query.tmdbId) return query.tmdbId;

    return this._tmdb.getMovieId(
      query.imdbId
        ? { imdbId: query.imdbId }
        : { title: query.title, year: query.year },
    );
  };

  _getKpId = async (query: Query) => {
    if (query.kpId) return query.kpId;

    return this._kp.getFilmId({
      title: query.title,
      year: query.year,
    });
  };

  _getTraktSlug = async (query: Query) => {
    if (query.traktSlug) return query.traktSlug;

    return !query.tmdbId ? null : this._trakt.getSlug({
      tmdbId: query.tmdbId,
    });
  };

  _getTmdbInfoForLang = async (tmdbId: ?number, lang: string) => (
    tmdbId ? ((await this._tmdb.getMovieInfo(tmdbId, lang)) || {}) : {}
  );

  _getTmdbInfo = async (tmdbId: ?number) => ({
    en: await this._getTmdbInfoForLang(tmdbId, 'en'),
    ru: await this._getTmdbInfoForLang(tmdbId, 'ru'),
  });

  _getKpInfo = async (kpId: ?number) => (
    kpId ? ((await this._kp.getFilmInfo(kpId)) || {}) : {}
  );

  _getKpCredits = async (kpId: ?number) => (
    kpId ? (await this._kp.getFilmCredits(kpId)) : null
  );

  _getImdbRating = async (imdbId: ?string) => (
    imdbId
      ? (await this._imdb.getRating(imdbId))
      : { imdbRating: NaN, imdbRatingVoteCount: NaN }
  );

  _getImdbPopularity = async (imdbId: ?string) => (
    imdbId ? (await this._imdb.getPopularity(imdbId)) : NaN
  );

  _getTraktWatchers = async (traktSlug: ?string) => {
    if (!traktSlug) return NaN;

    const res: ?Array<Object> = await this._trakt._connector.apiGet(
      `movies/${traktSlug}/watching`,
    );

    return res ? res.length : NaN;
  };

  getMovieInfo = async (query: Query): Promise<?MovieInfo> => {
    const [tmdbId, kpId] = await Promise.all([
      this._getTmdbId(query),
      this._getKpId(query),
    ]);
    const [traktSlug, tmdbInfo, kpInfo, kpCredits] = await Promise.all([
      this._getTraktSlug({ ...query, tmdbId }),
      this._getTmdbInfo(tmdbId),
      this._getKpInfo(kpId),
      this._getKpCredits(kpId),
    ]);
    const imdbId = query.imdbId || tmdbInfo.en.imdbId;
    const [imdbRating, imdbPopularity, traktWatchers] = await Promise.all([
      this._getImdbRating(imdbId),
      this._getImdbPopularity(imdbId),
      this._getTraktWatchers(traktSlug),
    ]);

    if (!tmdbInfo.en.title && !tmdbInfo.ru.title && !kpInfo.title) {
      return null;
    }

    const getCredits = (credits: *) => ({
      cast: credits && credits.cast ? credits.cast.slice(0, 30) : [],
      crew: {
        directors: credits && credits.crew ? credits.crew.directors : [],
      },
    });

    return {
      backdropUrl: tmdbInfo.en.backdropUrl || _.head(kpInfo.stills),
      credits: {
        en: getCredits(tmdbInfo.en.credits),
        ru: kpCredits ? getCredits(kpCredits) : getCredits(tmdbInfo.ru.credits),
      },
      genres: {
        en: tmdbInfo.en.genres || [],
        ru: kpInfo.genres || tmdbInfo.ru.genres || [],
      },
      imdbId: tmdbInfo.imdbId || query.imdbId,
      imdbPopularity: imdbPopularity || NaN,
      imdbRating: imdbRating.imdbRating || kpInfo.imdbRating || NaN,
      imdbRatingVoteCount:
        imdbRating.imdbRatingVoteCount || kpInfo.imdbRatingVoteCount || NaN,
      keywords: tmdbInfo.en.keywords,
      kpId,
      kpRating: kpInfo.kpRating || NaN,
      kpRatingVoteCount: kpInfo.kpRatingVoteCount || NaN,
      mpaaRating: kpInfo.mpaaRating,
      originalLanguage: tmdbInfo.en.originalLanguage,
      originalTitle: tmdbInfo.en.originalTitle || kpInfo.originalTitle,
      posterUrl: {
        en: tmdbInfo.en.posterUrl,
        ru: tmdbInfo.ru.posterUrl || kpInfo.posterUrl,
      },
      productionCountries: {
        en: _.map('iso_3166_1', tmdbInfo.en.productionCountries),
        ru: kpInfo.productionCountries || [],
      },
      releaseDate: tmdbInfo.en.releaseDate,
      rtCriticsRating: kpInfo.rtCriticsRating || NaN,
      rtCriticsRatingVoteCount: kpInfo.rtCriticsRatingVoteCount || NaN,
      runtime: tmdbInfo.en.runtime || kpInfo.runtime,
      stills: (kpInfo.stills || []).slice(0, 20),
      synopsis: {
        en: tmdbInfo.en.synopsis,
        ru: kpInfo.synopsis || tmdbInfo.ru.synopsis,
      },
      title: {
        en: tmdbInfo.en.title,
        ru: kpInfo.title || tmdbInfo.ru.title,
      },
      tmdbId: parseInt(tmdbInfo.en.tmdbId, 10) || query.tmdbId,
      tmdbPopularity: tmdbInfo.en.tmdbPopularity || NaN,
      tmdbRating: tmdbInfo.en.tmdbRating || NaN,
      tmdbRatingVoteCount: tmdbInfo.en.tmdbRatingVoteCount || NaN,
      traktSlug,
      traktWatchers,
      year: kpInfo.year || (
        tmdbInfo.en.releaseDate
          ? parseInt(tmdbInfo.en.releaseDate.slice(0, 4), 10)
          : NaN
      ),
      youtubeIds: {
        en: trailersFromTmdbVideos(tmdbInfo.en.videos),
        ru: trailersFromTmdbVideos(tmdbInfo.ru.videos),
      },
    };
  };

  getUpdates = async (query: Query): Promise<?Object> => {
    const [tmdbId, kpId, traktSlug] = await Promise.all([
      this._getTmdbId(query),
      this._getKpId(query),
      this._getTraktSlug(query),
    ]);
    const [
      tmdbInfo, kpInfo, imdbRating, imdbPopularity, traktWatchers,
    ] = await Promise.all([
      this._getTmdbInfoForLang(tmdbId, 'en'),
      this._getKpInfo(kpId),
      this._getImdbRating(query.imdbId),
      this._getImdbPopularity(query.imdbId),
      this._getTraktWatchers(traktSlug),
    ]);

    return {
      imdbPopularity: imdbPopularity || NaN,
      imdbRating: imdbRating.imdbRating || kpInfo.imdbRating || NaN,
      imdbRatingVoteCount:
        imdbRating.imdbRatingVoteCount || kpInfo.imdbRatingVoteCount || NaN,
      kpRating: kpInfo.kpRating,
      kpRatingVoteCount: kpInfo.kpRatingVoteCount || NaN,
      rtCriticsRating: kpInfo.rtCriticsRating || NaN,
      rtCriticsRatingVoteCount: kpInfo.rtCriticsRatingVoteCount || NaN,
      tmdbPopularity: tmdbInfo.tmdbPopularity || NaN,
      traktWatchers,
    };
  };

  findMatchOnTmdb = async (query: {
    title: string,
    year: number,
    imdbId?: ?string,
  }): Promise<?{ tmdbId: number, title: string }> => {
    if (query.imdbId) {
      const res = await this._tmdb._connector.apiGet(
        `find/${query.imdbId}`,
        { external_source: 'imdb_id' },
      );

      return _.flow(
        _.getOr([], 'movie_results'),
        _.head,
        (movie: ?{ id: number, title: string }) => (
          movie ? ({ tmdbId: movie.id, title: movie.title }) : null
        ),
      )(res);
    }

    const res = await this._tmdb._connector.apiGet(
      'search/movie',
      { query: query.title, year: query.year },
    );

    return _.flow(
      _.getOr([], 'results'),
      _.head,
      (movie: ?{ id: number, title: string }) => (
        movie ? ({ tmdbId: movie.id, title: movie.title }) : null
      ),
    )(res);
  };
}

export default MovieApi;
