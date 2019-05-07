'use strict';

/**
 * Module dependencies.
 */

var retryWrapper = require('superagent-retry');
var debug = require('debug')('objects-node');
var snakeCase = require('snake-case');
var request = require('superagent');
var mapKeys = require('map-keys');
var map = require('array-map');
var assert = require('assert');
var flatten = require('flat');

retryWrapper(request);

/**
 * Expose an `Objects` client.
 */

module.exports = Objects;

/**
 * Initialize a new `Objects` with your Segment project's `writeKey` and an
 * optional dictionary of `options`.
 *
 * @public
 * @class
 *
 * @param {String} writeKey
 * @param {Object} [options]
 */

function Objects(writeKey, opts) {
  if (!(this instanceof Objects)) return new Objects(writeKey);
  assert(writeKey, 'You must pass your Segment project\'s write key.');
  opts = opts || {};

  this._queue = {};
  this.writeKey = writeKey;
  this.host = opts.host || 'https://objects.segment.com';
  this.flushAt = Math.max(opts.flushAt, 1) || 100;
}

/**
 * Send a set `msg`.
 *
 * @param {string} collection
 * @param {string} id
 * @param {Object} properties
 * @param {Function} callback (optional)
 * @return {Analytics}
 */

Objects.prototype.set = function(collection, id, properties, callback) {
  assert(collection && typeof collection === 'string', 'You must specify a `collection`.');
  assert(id && typeof id === 'string', 'You must specify an `id`.');
  assert(typeof properties === 'object', 'You must specify `properties`.');

  this._enqueue(collection, {
    id: id,
    properties: transform(properties)
  }, callback);
};

/**
 * Flush the current queue and callback `(err, data)`.
 *
 * @param {string} collection
 * @param {Function} [callback]
 * @public
 */

Objects.prototype.flush = function(collection, callback) {
  assert(typeof collection === 'string', 'You must specify a `collection`.');
  callback = callback || noop;
  var queue = this._queue[collection];
  if (!(queue && queue.length)) return callback();

  var messages = queue.splice(0, this.flushAt);
  var callbacks = map(messages, function(msg) {
    return msg.callback;
  });
  var objects = map(messages, function(msg) {
    return msg.message;
  });
  var data = {
    collection: collection,
    objects: objects
  };

  request
    .post(this.host + '/v1/set')
    .auth(this.writeKey, '')
    .retry(3)
    .send(data)
    .end(function(err, res) {
      err = err || error(res);

      callbacks.push(callback);
      callbacks.forEach(function(cb) {
        cb(err, data);
      });

      debug('flushed: %o', data);
    });
};

/**
 * Enqueue `message` for `collection`.
 *
 * @param {string} collection
 * @param {Object} message
 * @param {Function} [callback]
 * @private
 */

Objects.prototype._enqueue = function(collection, message, callback) {
  callback = callback || noop;

  var queue = this._queue[collection] = [];
  queue.push({
    message: message,
    callback: callback
  });
  debug('enqueued %s: %o', collection, message);

  if (queue.length >= this.flushAt) this.flush(collection);
};

/**
 * Get an error from a `res`.
 *
 * @param {Object} res
 * @return {Error}
 */

function error(res) {
  if (!res.error) return;
  var body = res.body;
  var msg = body.error && body.error.message
    || res.status + ' ' + res.text;
  return new Error(msg);
}

/**
 * Transform object for SQL.
 *
 * @param {Object} object
 */

function transform(obj) {
  obj = flatten(obj, { delimiter: '_' });
  obj = mapKeys(obj, snakeCase);
  return obj;
}

/**
 * Noop
 */

function noop() {}
