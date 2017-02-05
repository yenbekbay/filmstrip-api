module.exports = {
  extends: [
    'anvilabs',
    'anvilabs/jest',
    'anvilabs/lodash',
  ],
  rules: {
    indent: 0,
    'no-confusing-arrow': 0,
    'no-magic-numbers': 0,
    'no-mixed-operators': 0,

    'babel/object-curly-spacing': [2, 'never'],
  },
};
