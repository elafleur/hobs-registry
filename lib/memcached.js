'use strict';

var config = require('config');
var memjs = require('memjs');

/**
 * Set up memcached client.
 */

var client = memjs.Client.create(config.get('memcached.servers').join(','), {
  username: config.get('memcached.username'),
  password: config.get('memcached.password')
});

module.exports = client;
