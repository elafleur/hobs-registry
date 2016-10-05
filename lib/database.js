'use strict';

var serverStatus = require('./status');
var memcached = require('./memcached');
var config = require('config');
var mongoose = require('mongoose');
var Package = mongoose.model('Package');
var Tarball = mongoose.model('Tarball');

/**
 * Set up database connection with auto_reconnect.
 */

var db = mongoose.connection;

db.on('error', function(err) {
  console.error('Error in MongoDb connection: ' + err);
  serverStatus.errors.dbConnect++;
  mongoose.disconnect();
});

db.on('disconnected', function() {
  console.log('disconnected');
  mongoose.connect(config.database.url, {
    server: {
      auto_reconnect: true,
      socketOptions: {
        keepAlive: 1,
        connectTimeoutMS: 30000
      }
    },
    replset: {
      socketOptions: {
        keepAlive: 1,
        connectTimeoutMS: 30000
      }
    }
  });
});

mongoose.connect(config.database.url, {
  server: {
    auto_reconnect: true
  }
});

/**
 * Flush memcached.
 */

function removeCacheAndReturn(callback) {
  memcached.flush(function(lastErr, results) {
    if (lastErr) {
      console.error(results);
    }

    callback();
  });
}

exports.getReleases = function(packageId, callback) {
  Tarball
    .find({
      package: packageId
    })
    .sort({
      version: -1
    })
    .select('-__v -package -data')
    .exec(callback);
};

exports.getTarball = function(packageId, version, callback) {
  Tarball
    .findOne({
      package: packageId,
      version: version
    })
    .exec(callback);
};

exports.insertTarball = function(object, callback) {
  var tar = new Tarball(object);
  tar.save(function(err) {
    if (err) {
      return callback(err);
    }
    callback();
  });
};

exports.getPackage = function(name, callback) {
  Package
    .findOne({
      name: name
    })
    .select('-__v')
    .populate('owner', 'name email')
    .exec(callback);
};

exports.insertPackage = function(object, callback) {
  var pack = new Package(object);
  pack.save(function(err) {
    if (err) {
      return callback(err);
    }
    removeCacheAndReturn(callback);
  });
};

exports.updateVersionPackage = function(name, object, callback) {
  Package
    .findOne({
      name: name
    })
    .update(object)
    .exec(function(err) {
      if (err) {
        return callback(err);
      }
      removeCacheAndReturn(callback);
    });
};

exports.deletePackage = function(name, callback) {
  Package
    .findOneAndRemove({
      name: name
    })
    .exec(function(err, pack) {
      if (err) {
        return callback(err);
      }
      Tarball
        .find({
          package: pack._id
        })
        .remove()
        .exec(function(err) {
          if (err) {
            return callback(err);
          }
          removeCacheAndReturn(callback);
        });
    });
};

exports.getPackages = function(sort, direction, skip, limit, callback) {
  var sortBy = {};
  sortBy[sort] = direction;

  Package
    .find({})
    .sort(sortBy)
    .limit(limit)
    .skip(skip)
    .select('-__v')
    .populate('owner', 'name email')
    .exec(callback);
};

exports.searchPackages = function(term, skip, limit, callback) {
  Package
    .find({
      $text: {
        $search: term
      }
    }, {
      score: {
        $meta: 'textScore'
      }
    })
    .sort({
      score: {
        $meta: 'textScore'
      }
    })
    .limit(limit)
    .skip(skip)
    .select('-__v')
    .populate('owner', 'name email')
    .exec(callback);
};

exports.hit = function(name) {
  Package
    .findOne({
      name: name
    })
    .update({
      $inc: {
        downloads: 1
      }
    })
    .exec();
};

exports.dropDatabase = function(callback) {
  // just to be safe :)
  if (process.env.NODE_ENV === 'production') {
    return callback();
  }

  mongoose.connection.db.dropDatabase(function(err) {
    if (err) {
      console.error(err);
    }
    callback(err);
  });
};
