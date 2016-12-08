/* @flow */

import MovieApi from '../../MovieApi';
import saveNewEnMovies from './saveNewEnMovies';
import saveNewRuMovies from './saveNewRuMovies';
import Torrentino from '../../Torrentino';
import Tpb from '../../Tpb';
import Yts from '../../Yts';
import type { AgendaContext } from '../../';

export type JobContext = AgendaContext & {
  yts: Yts,
  tpb: Tpb,
  torrentino: Torrentino,
  movieApi: MovieApi,
};

const saveNewMovies = async (context: AgendaContext) => {
  const yts = new Yts();
  const tpb = new Tpb();
  const torrentino = new Torrentino();
  const movieApi = new MovieApi();

  const jobContext = { ...context, yts, tpb, torrentino, movieApi };

  await saveNewEnMovies(jobContext);
  await saveNewRuMovies(jobContext);
};

export default saveNewMovies;
