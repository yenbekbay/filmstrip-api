# Filmstrip API

[![Dependency Status](https://img.shields.io/david/yenbekbay/filmstrip-api.svg)](https://david-dm.org/yenbekbay/filmstrip-api)
[![devDependency Status](https://img.shields.io/david/dev/yenbekbay/filmstrip-api.svg)](https://david-dm.org/yenbekbay/filmstrip-api?type=dev)
[![Commitizen Friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli)

The backend for Filmstrip. Built with [movie-api](https://github.com/anvilabs/movie-api), [GraphQL-tools](https://github.com/apollostack/graphql-tools), [GraphQL-server](https://github.com/apollostack/graphql-server), [MongoDB](https://github.com/mongodb/node-mongodb-native), and [Agenda](https://github.com/rschmukler/agenda).

## Running the server

1. **Install node/npm/yarn.** The app has been tested with node `6.9.1`.

2. **Clone and install dependencies:**
```bash
$ git clone https://github.com/yenbekbay/filmstrip-api.git
$ cd filmstrip-api
$ yarn # npm install
```

3. **Start a local MongoDB server.** For macOS, you can use [mongoDB.app](http://gcollazo.github.io/mongodbapp/).

4. **Add environment variables:**
`cp .env.example .env` and edit with your values.

5. **Get some data**
```bash
$ yarn run-job # npm run run-job
# Select `saveNewMovies`
```

6. **Run the server**
```bash
$ yarn start # npm start
```
Open [http://localhost:8080/graphiql](http://localhost:8080/graphiql) and try some queries.

## License

[GNU GPLv3 License](./LICENSE) © Ayan Yenbekbay
