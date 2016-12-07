/* @flow */

import HtmlConnector from 'movie-api/lib/HtmlConnector';

const TORRENTINO_ROOT = 'http://www.torrentino.me';

class TorrentinoConnector extends HtmlConnector {
  constructor() {
    super({
      rootUrl: TORRENTINO_ROOT,
      rps: 0.5,
    });
  }
}

export default TorrentinoConnector;
