/* @flow */

import querystring from 'querystring';

import DataLoader from 'dataloader';
import PromiseThrottle from 'promise-throttle';
import rp from 'request-promise-native';

const YTS_API_ROOT = 'https://yts.ag/api/v2';

class YtsConnector {
  _rp = rp.defaults({
    headers: {'User-Agent': 'filmstrip'},
    gzip: true,
    json: true,
  });

  _apiThrottleQueue = new PromiseThrottle({
    requestsPerSecond: 3,
    promiseImplementation: Promise,
  });

  apiLoader: {load(url: string): Promise<any>} = new DataLoader(
    (urls: Array<string>) =>
      this._apiThrottleQueue.addAll(
        urls.map((url: string) => () => this._rp({uri: url})),
      ),
    {
      batch: false,
    },
  );

  apiGet = (endpoint: string, query: {[key: string]: mixed}) =>
    this.apiLoader.load(
      `${YTS_API_ROOT}/${endpoint}?${querystring.stringify(query)}`,
    );
}

export default YtsConnector;
