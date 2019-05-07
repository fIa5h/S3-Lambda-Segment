'use strict';

var server = require('./server');
var map = require('array-map');
var assert = require('assert');
var Objects = require('..');

var objects;

describe('Objects', function() {
  before(function(done) {
    server.app
      .post('/v1/set', server.fixture)
      .listen(server.ports.source, done);
  });

  beforeEach(function() {
    objects = new Objects('key', {
      host: 'http://localhost:4063',
      flushAt: Infinity
    });
  });

  it('should expose a constructor', function() {
    assert.equal('function', typeof Objects);
  });

  it('should require a write key', function() {
    assert.throws(Objects, error('You must pass your Segment project\'s write key.'));
  });

  it('should create a queue', function() {
    assert.deepEqual(objects._queue, []);
  });

  it('should set default options', function() {
    var objects = new Objects('key');
    assert.equal(objects.writeKey, 'key');
    assert.equal(objects.host, 'https://objects.segment.com');
    assert.equal(objects.flushAt, 100);
  });

  it('should take options', function() {
    var objects = new Objects('key', {
      host: 'a',
      flushAt: 1,
      flushAfter: 2
    });
    assert.equal(objects.host, 'a');
    assert.equal(objects.flushAt, 1);
  });

  it('should keep the flushAt option above zero', function() {
    var objects = Objects('key', { flushAt: 0 });
    assert.equal(objects.flushAt, 100);
  });

  describe('#_enqueue', function() {
    it('should add a message to the queue', function() {
      objects._enqueue('users', {
        id: 'abc123',
        properties: {
          name: 'John Doe'
        }
      }, noop);

      var queue = objects._queue.users;
      var object = queue[0].message;
      var callback = queue[0].callback;

      assert.equal(callback, noop);
      assert.equal(object.id, 'abc123');
      assert.equal(object.properties.name, 'John Doe');
    });

    it('should flush the queue if it hits the max length', function(done) {
      objects.flushAt = 1;
      objects.flushAfter = null;
      objects._enqueue('users', {}, done);
    });
  });

  describe('#flush', function() {
    it('should not fail when no items are in the queue', function(done) {
      objects.flush('users', done);
    });

    it('should send a batch of items', function(done) {
      objects.flushAt = 2;
      var messages = [
        {
          id: '1',
          properties: {
            name: 'tejas'
          }
        },
        {
          id: '2',
          properties: {
            name: 'segment'
          }
        }
      ];
      enqueue(objects, 'users', messages);
      objects.flush('users', function(err, data) {
        if (err) return done(err);
        assert.deepEqual(data.objects, messages);
        done();
      });
    });

    it('should callback with an HTTP error', function(done) {
      enqueue(objects, 'users', [{
        id: '1',
        properties: 'error'
      }]);
      objects.flush('users', function(err) {
        assert(err);
        assert.equal(err.message, 'Bad Request');
        done();
      });
    });
  });

  describe('#set', function() {
    it('should enqueue a message', function() {
      objects.set('users', 'abc123', {
        name: 'John Doe'
      });
      assert.deepEqual(objects._queue.users[0].message, {
        id: 'abc123',
        properties: {
          name: 'John Doe'
        }
      });
    });

    it('should validate collection', function() {
      assert.throws(
        function() {
          objects.set({ name: 'haha' });
        },
        error('You must specify a `collection`.')
      );
    });

    it('should validate id', function() {
      assert.throws(
        function() {
          objects.set('apples', null, {
            name: 'haha'
          });
        },
        error('You must specify an `id`.')
      );
    });

    it('should validate properties', function() {
      assert.throws(
        function() {
          objects.set('c', 'i');
        },
        error('You must specify `properties`.')
      );
    });

    it('should flatten properties', function() {
      objects.set('users', 'abc123', {
        name: {
          first: 'Tejas',
          last: 'Manohar'
        }
      });
      assert.deepEqual(objects._queue.users[0].message, {
        id: 'abc123',
        properties: {
          name_first: 'Tejas',
          name_last: 'Manohar'
        }
      });
    });

    it('should snakecase properties', function() {
      objects.set('users', 'abc123', {
        fullName: 'Tejas Manohar'
      });
      assert.deepEqual(objects._queue.users[0].message, {
        id: 'abc123',
        properties: {
          full_name: 'Tejas Manohar'
        }
      });
    });
  });
});

/**
 * Create a queue with `messages`.
 *
 * @param {Objects} objects
 * @param {string} collection
 * @param {Array} messages
 * @return {Array}
 */

function enqueue(objects, collection, messages) {
  objects._queue = {};
  objects._queue[collection] = map(messages, function(msg) {
    return {
      message: msg,
      callback: noop
    };
  });
}

/**
 * Assert an error with `message` is thrown.
 *
 * @param {String} message
 * @return {Function}
 */

function error(message) {
  return function(err) {
    return err.message === message;
  };
}

function noop() {}
