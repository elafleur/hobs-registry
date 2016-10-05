'use strict';

var serverStatus = require('../status');
var database = require('../database');
var isValidName = require('../validName');
var validateURL = require('../validURL');
var normalizeURL = require('../normalizeURL');
var buildTarball = require('../buildTarball');
var memcached = require('../memcached');
var async = require('async');
var mongoose = require('mongoose');

/**
 * Parse validation errors coming from mongoose.
 */

function parseValidationError(error) {
  var messages = '';
  for (var err in error.errors) {
    if (error.errors.hasOwnProperty(err)) {
      messages += error.errors[err].message + '\n';
    }
  }
  return messages;
}

/**
 * Remove a package from the registry.
 */

exports.remove = function(request, response, next) {
  serverStatus.removePackage++;

  var name = request.body.name;

  database.getPackage(name, function(error, pack) {
    if (error) {
      serverStatus.errors.removePackageQuery++;
      return next(error);
    }

    if (pack) {
      if (pack.owner._id != request.user.sub) {
        serverStatus.errors.notAuthorized++;
        return response.status(403).send('You must be the package owner');
      }

      database.deletePackage(name, function(error) {
        if (error) {
          serverStatus.errors.removePackageQuery++;
          return next(error);
        }
        response.status(204).send('Package ' + name + ' successfully deleted');
      });
    } else {
      serverStatus.errors.notFound++;
      return response.status(404).send('Package not found');
    }
  });
};

/**
 * Return a sorted list of packages definition.
 */

exports.find = function(request, response, next) {
  if (request.query.q) {
    return exports.search(request, response);
  }

  response.setHeader('Content-Type', 'application/json');

  serverStatus.allPackages++;

  var sort = request.query.sort || 'downloads';
  var direction = request.query.direction || 'desc';
  var page = Math.max(1, Math.min(1000, parseInt(request.query.page, 10) || 1));

  var pageLength = 20;
  var skip = page * pageLength - pageLength;

  var cacheKey = 'packages:' + sort + ':' + direction + ':' + page;
  memcached.get(cacheKey, function(error, value, key) {
    if (error) {
      serverStatus.errors.allPackagesQuery++;
      return next(error);
    }

    if (value) {
      response.send(value);
    } else {
      database.getPackages(sort, direction, skip, pageLength, function(error, result) {
        if (error) {
          serverStatus.errors.allPackagesQuery++;
          return next(error);
        }

        if (result.length > 0) {
          memcached.set(cacheKey, JSON.stringify(result), function(error, value) {
            if (error) {
              serverStatus.errors.allPackagesQuery++;
              return next(error);
            }

            return exports.find(request, response);
          }, 0);
        } else {
          response.send(result);
        }
      });
    }
  });
};

/**
 * Prepare a tarball to be inserted in the database.
 */

function prepareTarball(buffer, sum, horusJson, packageId) {
  var depends = [];

  // get package dependencies
  for (var deps in horusJson.dependencies) {
    if (horusJson.dependencies.hasOwnProperty(deps)) {
      depends.push(deps + ' ' + horusJson.dependencies[deps]);
    }
  }

  var tarballFields = {
    package: packageId,
    version: horusJson.version,
    depends: depends,
    data: buffer,
    size: buffer.length,
    hash: sum,
  };

  return tarballFields;
}

/**
 * Prepare a package to be inserted in the database.
 */

function preparePackage(isNew, horusJson, packageId, userId) {
  var newFields = {
    latest_version: horusJson.version,
    description: horusJson.description || '',
    tags: horusJson.tags || [],
    url: typeof horusJson.repository === 'object' ?
      horusJson.repository.url : horusJson.repository,
  };

  if (isNew) {
    newFields._id = packageId;
    newFields.name = horusJson.name;
    newFields.owner = userId;
  } else {
    newFields.updated_at = Date.now();
  }

  return newFields;
}

/**
 * Insert a package in the database with its associated tarball.
 */

function processPackage(request, response, next) {
  return function(buffer, sum, horusJson) {
    var validation = horusJson.name ?
      isValidName(horusJson.name) : {
        error: 'Name not provided'
      };

    if (validation.error) {
      serverStatus.errors.badName++;
      return response.status(400).send('Invalid package name. ' + validation.error);
    }

    database.getPackage(horusJson.name, function(error, pack) {
      if (error) {
        serverStatus.errors.createPackageQuery++;
        return next(error);
      }

      if (!pack) {
        // package doesn't exist, create it
        serverStatus.createPackage++;
        var packageId = mongoose.Types.ObjectId();

        var tarballFields = prepareTarball(buffer, sum, horusJson, packageId);
        database.insertTarball(tarballFields, function(error) {
          if (error) {
            if (error.name === 'ValidationError') {
              return response.status(400).send(parseValidationError(error));
            }
            serverStatus.errors.createPackageQuery++;
            return next(error);
          }

          var newFields = preparePackage(true, horusJson, packageId, request.user.sub);
          database.insertPackage(newFields, function(error) {
            if (error) {
              if (error.name === 'ValidationError') {
                return response.status(400).send(parseValidationError(error));
              }

              // TODO: rollback Tarball on error
              serverStatus.errors.createPackageQuery++;
              return next(error);
            }
            response.status(201).send('Package ' + horusJson.name + ' successfully created');
          });
        });
      } else {
        // package exists, update it
        if (pack.owner._id != request.user.sub) {
          serverStatus.errors.notAuthorized++;
          return response.status(403).send('Package already registered, you must be the owner to update it');
        }

        database.getTarball(pack._id, horusJson.version, function(error, tar) {
          if (error) {
            serverStatus.errors.createPackageQuery++;
            return next(error);
          }

          if (!tar) {
            var tarballFields = prepareTarball(buffer, sum, horusJson, pack._id);
            database.insertTarball(tarballFields, function(error) {
              if (error) {
                if (error.name === 'ValidationError') {
                  return response.status(400).send(parseValidationError(error));
                }
                serverStatus.errors.createPackageQuery++;
                return next(error);
              }

              var updatedFields = preparePackage(false, horusJson);
              database.updateVersionPackage(horusJson.name, updatedFields, function(error) {
                if (error) {
                  serverStatus.errors.updatePackageQuery++;
                  return next(error);
                }
                response.status(201).send('Package ' + horusJson.name + ' bumped to version ' + horusJson.version);
              });
            });
          } else {
            response.status(400).send('Version already exists');
          }
        });
      }
    });
  };
}

/**
 * Create a package if it's new or update it otherwise.
 */

exports.createOrUpdate = function(request, response, next) {
  var url = request.body.url;

  if (!url) {
    // package is an archive
    buildTarball.archive(request, function(error, buffer, sum, horusJson) {
      if (error) {
        if (error.name === 'TarballError') {
          return response.status(400).send(error.message);
        }
        return next(error);
      }

      var processor = processPackage(request, response, next);
      processor(buffer, sum, horusJson);
    });
  } else {
    // package must be fetched from git URL
    url = normalizeURL(url);
    validateURL(url, function(isValidURL) {
      if (isValidURL) {
        buildTarball.git(url, function(error, buffer, sum, horusJson) {
          if (error) {
            if (error.name === 'TarballError') {
              return response.status(400).send(error.message);
            }
            return next(error);
          }

          var processor = processPackage(request, response, next);
          processor(buffer, sum, horusJson);
        });
      } else {
        serverStatus.errors.badUrl++;
        response.status(400).send('Invalid URL');
      }
    });
  }
};

/**
 * Return a package definition.
 */

exports.fetch = function(request, response, next) {
  serverStatus.getPackage++;

  database.getPackage(request.params.name, function(error, pack) {
    if (error) {
      serverStatus.errors.getPackageQuery++;
      return next(error);
    }
    if (!pack) {
      serverStatus.errors.notFound++;
      return response.status(404).send('Package not found');
    }

    database.getReleases(pack._id, function(error, releases) {
      if (error) {
        serverStatus.errors.getPackageQuery++;
      } else if (releases.length < 1) {
        serverStatus.errors.notFound++;
      } else {
        // append releases only if there are more than one
        pack = pack.toObject();
        pack.releases = releases;
      }

      response.send(pack);
    });
  });
};

/**
 * Search packages.
 */

exports.search = function(request, response, next) {
  serverStatus.searchPackage++;

  var term = request.query.q;
  var page = Math.max(1, Math.min(1000, parseInt(request.query.page, 10) || 1));

  var pageLength = parseInt(request.query.per_page, 10) || 20;
  var skip = page * pageLength - pageLength;

  database.searchPackages(term, skip, pageLength, function(error, result) {
    if (error) {
      serverStatus.errors.searchPackageQuery++;
      return next(error);
    }
    response.send(result);
  });
};

/**
 * Download a package tarball.
 */

exports.download = function(request, response, next) {
  serverStatus.downloadPackage++;

  response.setHeader('Cache-Control', 'no-cache');

  database.getPackage(request.params.name, function(error, pack) {
    if (error) {
      serverStatus.errors.createPackageQuery++;
      return next(error);
    }

    if (!pack) {
      serverStatus.errors.notFound++;
      return response.status(404).send('Package not found');
    }

    var version = request.query.version === 'latest' ?
      pack.latest_version : request.query.version;
    database.getTarball(pack._id, version, function(error, tar) {
      if (error) {
        serverStatus.errors.createPackageQuery++;
        return next(error);
      }

      if (!tar) {
        serverStatus.errors.notFound++;
        return response.status(404).send('Package version not found');
      }

      response.setHeader('Content-Type', 'application/x-gzip');
      response.setHeader('Cache-Control', 'public, max-age=14400');
      response.send(tar.data);

      // increase download count
      database.hit(request.params.name);
    });
  });
};

/**
 * Assemble package lists.
 */

function buildPackageLists(packages, callback) {
  var packList = '';
  var packIndex = '';

  packages = Array.isArray(packages) ?
    packages : [packages];

  async.eachSeries(packages, function(pack, cb) {
    database.getTarball(pack._id, pack.latest_version, function(error, tar) {
      if (error) {
        serverStatus.errors.getPackageListQuery++;
        return cb(error);
      }

      if (!tar) {
        serverStatus.errors.notFound++;
        return cb('Package version not found');
      }

      // assemble package list
      var firstByte = packList.length;
      packList += 'Package: ' + pack.name + '\n';
      packList += 'Maintainer: ' + pack.owner.name + ' <' + pack.owner.email + '>\n';
      packList += 'Version: ' + pack.latest_version + '\n';
      packList += 'Description: ' + pack.description + '\n';
      packList += 'Depends: ' + tar.depends + '\n';
      packList += 'Tags: ' + pack.tags + '\n';
      packList += 'Url: ' + pack.url + '\n';
      packList += 'Size: ' + tar.size + '\n';
      packList += 'SHA256: ' + tar.hash + '\n';
      packList += '\n';
      var lastByte = packList.length - 1;

      // update index
      packIndex += pack.name + '@' + pack.latest_version + '[' + firstByte + '-' + lastByte + ']\n';

      cb();
    });
  }, function(error) {
    callback(error, packIndex, packList);
  });
}

/**
 * Return either the complete list of packages definition in plain text or an
 * index of the position of every package in the list.
 *
 * The index is a list of:
 * <package_name>@<version>[<start_byte>-<end_byte>]\n
 *
 * After updating its index, a package manager is thus able to update only the
 * differing package definitions using Byte serving (range requests).
 */

exports.catalog = function(request, response, next) {
  response.setHeader('Content-Type', 'text/plain; charset=UTF-8');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Accept-Ranges', 'bytes');

  // determine which list is being retrieved
  var cacheKey;
  if (request.path === '/packages.list') {
    serverStatus.getPackageList++;
    cacheKey = 'packages:list';
  } else {
    serverStatus.getPackageIndex++;
    cacheKey = 'packages:index';
  }

  memcached.get(cacheKey, function(error, value, key) {
    if (error) {
      serverStatus.errors.getPackageListQuery++;
      return next(error);
    }

    if (value) {
      response.send(value);
    } else {
      database.getPackages('name', 'asc', 0, 0, function(error, result) {
        if (error) {
          serverStatus.errors.getPackageListQuery++;
          return next(error);
        }

        if (result) {
          buildPackageLists(result, function(error, packIndex, packList) {
            if (error) {
              return next(error);
            }

            memcached.set('packages:index', packIndex, function(error, value) {
              if (error) {
                serverStatus.errors.getPackageListQuery++;
                return next(error);
              }
              memcached.set('packages:list', packList, function(error, value) {
                if (error) {
                  serverStatus.errors.getPackageListQuery++;
                  return next(error);
                }

                return exports.catalog(request, response);
              }, 0);
            }, 0);
          });
        } else {
          // no packages in the registry
          response.send('');
        }
      });
    }
  });
};
