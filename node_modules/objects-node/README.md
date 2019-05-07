# objects-node [![Build Status](https://travis-ci.org/segmentio/objects-node.svg?branch=master)](https://travis-ci.org/segmentio/objects-node) [![npm version](https://badge.fury.io/js/objects-node.svg)](https://badge.fury.io/js/objects-node)

  Node.js client for Segment Objects API


## Setup

To install,

`npm install --save objects-node`

Then, in your code,

```js
var Objects = require('objects-node');
var objects = new Objects('<your write key>')
```


## Usage

```js
objects.set('<collection>', '<id>', {
  some_property: 'some value',
  name: 'Schrodinger',
  is_alive: true,
  is_dead: true,
  owner: 'Erwin',
  birth_year: 1935
});
```


## License

MIT
