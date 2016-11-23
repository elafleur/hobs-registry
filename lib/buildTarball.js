'use strict';

var TarballError = require('./TarballError');
var spawn = require('child_process').spawn;
var config = require('config');
var uuid = require('uuid');
var rimraf = require('rimraf');
var tar = require('tar');
var zlib = require('zlib');
var crypto = require('crypto');
var fstream = require('fstream');
var path = require('path');

/**
 * Delete package temp directory.
 *
 * @param {String} dir
 * @param {Function} cb
 * @api private
 */

function cleanUp(dir, cb) {
  rimraf(dir, function(err) {
    if (err) {
      console.error(err);
    }
    cb();
  });
}

/**
 * Compress package as a Buffer and calculate its hash.
 *
 * @param {String} dir
 * @param {String} target
 * @param {Object} horusJson
 * @param {Function} cb
 * @api private
 */

function compress(dir, target, horusJson, cb) {
  var buffers = [];
  var hadError = false;
  var stream = fstream.Reader({
      path: dir,
      type: 'Directory'
    })
    .pipe(tar.Pack({
      fromBase: true
    }))
    .pipe(zlib.createGzip());

  var hash = crypto.createHash('sha256');

  stream.on('error', function(err) {
    hadError = true;
    return cb(err);
  });

  stream.on('data', function(data) {
    buffers.push(data);
    hash.update(data, 'utf8');
  });

  stream.on('close', function() {
    if (!hadError) {
      var buffer = Buffer.concat(buffers);

      // make sure package is not too big
      if (buffer.length > config.get('maxSize')) {
        cb(new TarballError('Package can\'t be bigger than ' + config.get('maxSize') + ' bytes'));
      } else {
        cb(null, buffer, hash.digest('hex'), horusJson);
      }
    }

    // clean up behind us
    cleanUp(path.join(config.get('tmpDir'), target), function() {});
  });
}

/**
 * Check whether the package contains a valid horus.json file.
 *
 * @param {String} dir
 * @return {Object}
 * @api private
 */

function validPackage(dir) {
  var horusJson;
  try {
    horusJson = require(dir);
  } catch (err) {
    return null;
  }
  return horusJson;
}

/**
 * Clone a git repository and validate that it's a Hobs package.
 *
 * @param {String} url
 * @param {Function} cb
 * @api public
 */

exports.git = function(url, cb) {
  var target = uuid.v4();

  var git = spawn('git', ['clone', url, target], {
    cwd: config.get('tmpDir'),
    stdio: 'ignore'
  });

  git.on('close', function(exitCode) {
    var dir = path.join(config.get('tmpDir'), target);

    if (exitCode === 0) {
      var horusFile = 'horus.json';
      var horusFolder = '.horus';
      var horusJson;

      // package can either be the repo itself or a .horus subdirectory
      horusJson = validPackage(path.join(dir, horusFolder, horusFile));

      if (horusJson) {
        compress(path.join(dir, horusFolder), target, horusJson, cb);
      } else {
        horusJson = validPackage(path.join(dir, horusFile));

        if (horusJson) {
          compress(dir, target, horusJson, cb);
        } else {
          cb(new TarballError('Repository does not contain a valid horus.json file'));

          // clean up behind us
          cleanUp(dir, function() {});
        }
      }
    } else {
      cb(new TarballError('Failed to clone repository'));

      // clean up behind us
      cleanUp(dir, function() {});
    }
  });
};

/**
 * Extract an archive and validate that it's a Hobs package.
 * The req object represents the HTTP request.
 *
 * @param {Object} req
 * @param {Function} cb
 * @api public
 */

exports.archive = function(req, cb) {
  var target = uuid.v4();
  var dir = path.join(config.get('tmpDir'), target);
  var hadError = false;

  var stream = req.pipe(zlib.createGunzip())
    .pipe(tar.Extract({
      path: dir
    }));

  stream.on('error', function(err) {
    hadError = true;
    return cb(err);
  });

  stream.on('finish', function() {
    if (!hadError) {
      var horusFile = 'horus.json';
      var horusJson = validPackage(path.join(dir, horusFile));

      if (horusJson) {
        compress(dir, target, horusJson, cb);
      } else {
        cb(new TarballError('Repository does not contain a valid horus.json file'));

        // clean up behind us
        cleanUp(dir, function() {});
      }
    } else {
      // clean up behind us
      cleanUp(dir, function() {});
    }
  });
};
