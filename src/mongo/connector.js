/* @flow */

import {MongoClient} from 'mongodb';

import {mongoUrl} from '../env';

class MongoConnector {
  _db: ?Object;

  getDb = async () => {
    if (this._db) return this._db;

    this._db = await MongoClient.connect(mongoUrl);

    return this._db;
  };

  getCollection = async (collectionName: string) => {
    const db = await this.getDb();

    return db.collection(collectionName);
  };
}

const connector = new MongoConnector();

export default connector;
