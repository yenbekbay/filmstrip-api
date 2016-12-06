/* @flow */

import { filter } from 'graphql-anywhere';
import { Tmdb, Imdb, Kinopoisk } from 'movie-api';
import _ from 'lodash/fp';
import gql from 'graphql-tag';

import { tmdbApiKey, imdbUserId } from '../env';
import type { MovieInfo } from '../types';

const TMDB_MOVIE_INFO_QUERY = gql`
  {
    tmdbId
    imdbId
    backdropUrl
    genres
    keywords
    originalTitle
    originalLanguage
    posterUrl
    productionCountries { iso_3166_1 }
    releaseDate
    runtime
    synopsis
    title
    tmdbRating
    tmdbRatingVoteCount
    credits {
      cast {
        character
        name
        photoUrl
      }
      crew {
        directors {
          name
          photoUrl
        }
      }
    }
    videos {
      iso_639_1
      key
      site
      type
    }
  }
`;
const KP_MOVIE_INFO_QUERY = gql`
  {
    kpId
    kpRating
    kpRatingVoteCount
    rtCriticsRating
    rtCriticsRatingVoteCount
    mpaaRating
  }
`;

type Query = {
  title: string,
  year: number,
  imdbId: string,
  tmdbId?: ?number,
  kpId?: ?number,
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

  _getTmdbInfo = async ({ imdbId, tmdbId }: Query) => {
    const movieId = tmdbId || await this._tmdb.getMovieId({ imdbId });

    return movieId
      ? filter(TMDB_MOVIE_INFO_QUERY, await this._tmdb.getMovieInfo(movieId))
      : {};
  };

  _getKinopoiskInfo = async ({ title, year, kpId }: Query) => {
    const movieId = kpId || await this._kp.getFilmId({ title, year });

    return movieId
      ? filter(KP_MOVIE_INFO_QUERY, await this._kp.getFilmInfo(movieId))
      : {};
  };

  getMovieInfo = async (query: Query): Promise<?MovieInfo> => {
    const tmdbInfo = await this._getTmdbInfo(query);

    if (!tmdbInfo) return null;

    const [kpInfo, imdbRating, imdbPopularity] = await Promise.all([
      this._getKinopoiskInfo(query),
      this._imdb.getRating(query.imdbId || tmdbInfo.imdbId),
      this._imdb.getPopularity(query.imdbId || tmdbInfo.imdbId),
    ]);

    return {
      ..._.omit(['videos'], tmdbInfo),
      ...imdbRating,
      ...kpInfo,
      imdbPopularity: imdbPopularity && imdbPopularity < 1000
        ? imdbPopularity
        : null,
      productionCountries: _.map('iso_3166_1', tmdbInfo.productionCountries),
      youtubeIds: _.flow(
        _.filter(
          ({ type, site }: Object) => type === 'Trailer' && site === 'YouTube',
        ),
        _.map('key'),
      )(tmdbInfo.videos),
    };
  };

  getUpdates = async (query: Query & { imdbId: string }): Promise<?Object> => {
    const [kpInfo, imdbRating, imdbPopularity] = await Promise.all([
      this._getKinopoiskInfo(query),
      this._imdb.getRating(query.imdbId),
      this._imdb.getPopularity(query.imdbId),
    ]);

    return {
      ...imdbRating,
      ...kpInfo,
      imdbPopularity: imdbPopularity && imdbPopularity < 1000
        ? imdbPopularity
        : null,
    };
  };

  findMovie = async (query: {
    title: string,
    year: number,
    imdbId: ?string,
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
          !movie ? null : ({
            tmdbId: movie.id,
            title: movie.title,
          })
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
        !movie ? null : ({
          tmdbId: movie.id,
          title: movie.title,
        })
      ),
    )(res);
  };
}

export default MovieApi;
