'use strict';

var memcached = require('./memcached');
var blacklist = require('express-jwt-blacklist');

/**
 * Configure blacklist custom store.
 */

blacklist.configure({
  store: {
    get: function(key, callback) {
      memcached.get(key, function(err, value) {
        var data = JSON.parse(value);
        callback(err, data);
      });
    },
    set: function(key, data, lifetime, callback) {
      var value = JSON.stringify(data);
      memcached.set(key, value, callback, lifetime);
    }
  }
});

module.exports = blacklist;
