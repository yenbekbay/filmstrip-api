/* @flow */

import _ from 'lodash/fp';
import type from 'type-detect';

const childTypesForArray = _.memoize(_.flow(_.map(type), _.uniq));

const modelFromObject = (obj: ?Object) =>
  _.mapValues(
    _.cond([
      [
        _.overEvery([
          _.flow(type, _.eq('Array')),
          _.flow(childTypesForArray, _.head, _.eq('Object')),
        ]),
        (val: Array<any>) => [_.flow(_.head, modelFromObject)(val)],
      ],
      [
        _.overEvery([
          _.flow(type, _.eq('Array')),
          _.flow(childTypesForArray, _.size, _.eq(1)),
        ]),
        (val: Array<any>) =>
          `Array<${_.flow(childTypesForArray, _.head)(val)}>`,
      ],
      [_.flow(type, _.includes(_, ['Object', 'Array'])), modelFromObject],
      [_.stubTrue, type],
    ]),
    obj,
  );

export {modelFromObject}; // eslint-disable-line import/prefer-default-export
