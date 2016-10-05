'use strict';

var serverStatus = require('../status');
var blacklist = require('../blacklist');
var isValidName = require('../validName');
var config = require('config');
var auth = require('basic-auth');
var jwt = require('jsonwebtoken');
var mongoose = require('mongoose');
var User = mongoose.model('User');

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
 * Create a new user.
 */

exports.adduser = function(request, response, next) {
  var credentials = auth(request);

  if (!credentials) {
    var user = new User({
      name: request.body.name,
      email: request.body.email,
      password: request.body.password,
    });

    // validate its name
    var validation = user.name ?
      isValidName(user.name) : {
        error: 'Name not provided'
      };
    if (validation.error) {
      return response.status(400).send('Invalid user name. ' + validation.error);
    }

    user.save(function(error) {
      if (error) {
        if (error.name === 'ValidationError') {
          return response.status(400).send(parseValidationError(error));
        }
        serverStatus.errors.adduser++;
        return next(error);
      }

      // sign user_id and create jwt
      var token = jwt.sign({
        sub: user._id
      }, config.get('token.secret'), {
        expiresIn: config.get('token.expiresIn')
      });
      response.status(201).send({
        name: user.name,
        registry: request.headers.host,
        token: token
      });
    });
  } else {
    // user is authenticating
    exports.authenticate(request, response);
  }
};

/**
 * Authenticate a user.
 */

exports.authenticate = function(request, response, next) {
  var credentials = auth(request);

  User.getAuthenticated(credentials.name, credentials.pass, function(error, user, reason) {
    if (error) {
      serverStatus.errors.adduser++;
      return next(error);
    }

    if (!user) {
      switch (reason) {
        case 0:
        case 1:
          response.status(403).send('Wrong email and password combination');
          break;
        case 2:
          response.status(403).send('You\'ve reached the maximum number of login attempts. Please try again later.');
          break;
      }
    } else {
      // sign user_id and create jwt
      var token = jwt.sign({
        sub: user._id
      }, config.get('token.secret'), {
        expiresIn: config.get('token.expiresIn')
      });
      response.send({
        name: user.name,
        registry: request.headers.host,
        token: token
      });
    }
  });
};

/**
 * Revoke user token.
 */

exports.logout = function(request, response, next) {
  blacklist.revoke(request.user, function(error) {
    if (error) {
      serverStatus.errors.jwtBlacklist++;
      return next(error);
    }
    response.status(200).end();
  });
};
