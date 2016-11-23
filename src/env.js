/* @flow */

const optionalEnvVariable = (variableName: string) => process.env[variableName];
const requiredEnvVariable = (variableName: string) => {
  const variable = optionalEnvVariable(variableName);

  if (!variable) {
    throw new Error(`${variableName} environment variable is required`);
  }

  return variable;
};

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  isProduction,
  tmdbApiKey: requiredEnvVariable('TMDB_API_KEY'),
  imdbUserId: requiredEnvVariable('IMDB_USER_ID'),
  mongoUrl: (isProduction && optionalEnvVariable('MONGO_URL')) || 'mongodb://localhost:27017/filmstrip', // eslint-disable-line max-len
  papertrailHost: optionalEnvVariable('PAPERTRAIL_HOST'),
  papertrailPort: optionalEnvVariable('PAPERTRAIL_PORT'),
};
