/* @flow */

import cheerio from 'cheerio';
import DataLoader from 'dataloader';
import PromiseThrottle from 'promise-throttle';
import randomUseragent from 'random-useragent';
import retry from 'async-retry';
import rp from 'request-promise-native';

const TORRENTINO_ROOT = 'http://www.torrentino.me';

class HtmlConnector {
  _htmlThrottleQueue = new PromiseThrottle({
    requestsPerSecond: 0.5,
    promiseImplementation: Promise,
  });
  _htmlRp = rp.defaults({
    headers: {
      'User-Agent': randomUseragent.getRandom(),
    },
    gzip: true,
  });

  htmlLoader: {load(url: string): Promise<any>} = new DataLoader(
    (optionsHashes: Array<string>) => this._htmlThrottleQueue.addAll(
      optionsHashes.map((optionsHash: string) => () => retry(async (
        bail: (err: Error) => Promise<any>,
      ) => {
        try {
          const res = await this._htmlRp(JSON.parse(optionsHash));

          return cheerio.load(res);
        } catch (err) {
          if (err.statusCode === 403 || err.statusCode === 404) {
            return bail(err);
          }

          throw err;
        }
      }, {retries: 5})),
    ),
    {
      batch: false,
    },
  );

  htmlGet = (path: string, query: void | {[key: string]: mixed}) =>
    this.htmlLoader.load(
      JSON.stringify({
        uri: `${TORRENTINO_ROOT}/${path}`,
        qs: query || {},
      }),
    );
}

export default HtmlConnector;
