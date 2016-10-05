'use strict';

var spawn = require('child_process').spawn;
var config = require('config');
var skipValidation = config.get('skipValidation');

/**
 * Validate git URL.
 *
 * @param {String} url
 * @param {Function} cb
 * @api public
 */

module.exports = function(url, cb) {
  if (skipValidation) {
    return cb(true);
  }

  var git = spawn('timeout', ['10', 'git', 'ls-remote', url], {
    stdio: 'ignore'
  });

  git.on('close', function(exitCode) {
    cb(exitCode === 0);
  });
};
