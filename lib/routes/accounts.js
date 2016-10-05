'use strict';

var serverStatus = require('../status');
var blacklist = require('../blacklist');
var isValidName = require('../validName');
var Mailer = require('../mailer');
var uuid = require('node-uuid');
var mongoose = require('mongoose');
var User = mongoose.model('User');

var mailer = new Mailer();

/**
 * Show login page.
 */

exports.login = function(request, response) {
  if (request.session.user) {
    return response.redirect('/home');
  }

  response.render('login', {
    title: 'Hobs Registry - Sign in'
  });
};

/**
 * Authenticate a user.
 */

exports.authenticate = function(request, response, next) {
  User.getAuthenticated(request.body.user, request.body.pass, function(error, user, reason) {
    if (error) {
      serverStatus.errors.adduser++;
      return next(error);
    }

    if (!user) {
      switch (reason) {
        case 0:
        case 1:
          response.status(403).send('Wrong email and password combination.');
          break;
        case 2:
          response.status(403).send('You\'ve reached the maximum number of login attempts.<br>Please try again later.');
          break;
      }
    } else {
      // save user info in session
      request.session.user = user;
      response.status(200).send('ok');
    }
  });
};

/**
 * Show sign up page.
 */

exports.signup = function(request, response) {
  response.render('signup', {
    title: 'Hobs Registry - Sign up',
    user: {}
  });
};

/**
 * Create a new user.
 */

exports.createAccount = function(request, response) {
  var object = {
    full_name: request.body.name,
    email: request.body.email,
    name: request.body.user,
    password: request.body.pass
  };

  var user = new User(object);

  // validate its name
  var validation = user.name ?
    isValidName(user.name) : {
      error: 'Name not provided'
    };
  if (validation.error) {
    return response.status(400).send('username-invalid');
  }

  user.save(function(err) {
    if (err) {
      if (err.errors.email) {
        response.status(400).send('email-taken');
      } else if (err.errors.name) {
        response.status(400).send('username-taken');
      } else {
        response.status(400).send(err);
      }
    } else {
      response.status(200).send('ok');
    }
  });
};

/**
 * Show account page.
 */

exports.home = function(request, response) {
  if (!request.session.user) {
    return response.redirect('/');
  }

  response.render('home', {
    title: 'Hobs Registry - Profile',
    user: request.session.user
  });
};

/**
 * Update user info.
 */

exports.updateAccount = function(request, response, next) {
  if (!request.session.user) {
    return response.redirect('/');
  }

  User.findById(request.session.user._id, function(error, user) {
    if (error) {
      serverStatus.errors.adduser++;
      return next(error);
    }

    if (user) {
      user.full_name = request.body.name;
      user.email = request.body.email;

      user.save(function(err) {
        if (err) {
          if (err.errors.email) {
            response.status(400).send('email-taken');
          } else {
            response.status(400).send(err);
          }
        } else {
          request.session.user = user;
          response.status(200).send('ok');
        }
      });
    } else {
      response.status(400).send('record not found');
    }
  });
};

/**
 * Logout user.
 */

exports.logout = function(request, response) {
  // delete session
  request.session = null;
  response.status(200).send('ok');
};

/**
 * Delete user account.
 */

exports.deleteAccount = function(request, response, next) {
  User.findByIdAndRemove(request.session.user._id, function(error, user) {
    if (error) {
      serverStatus.errors.adduser++;
      return next(error);
    }

    if (user) {
      // purge all user tokens
      blacklist.purge({
        sub: user._id,
        iat: Date.now()
      }, function(error) {
        if (error) {
          serverStatus.errors.jwtBlacklist++;
          return next(error);
        }

        // delete session
        request.session = null;
        response.status(200).send('ok');
      });
    } else {
      response.status(400).send('record not found');
    }
  });
};

/**
 * Send a reset password email to the user.
 */

exports.lostPassword = function(request, response, next) {
  User.findOne({
    email: request.body.email
  }, function(error, user) {
    if (error) {
      serverStatus.errors.adduser++;
      return next(error);
    }

    if (user) {
      user.reset_id = uuid.v4();
      user.reset_ttl = Date.now() + 86400000;

      user.save(function(error, updatedUser) {
        if (error) {
          serverStatus.errors.adduser++;
          return next(error);
        }

        var mailOptions = mailer.writeMail(updatedUser.name, updatedUser.email, updatedUser.reset_id);
        mailer.sendMail(mailOptions, function(error) {
          if (error) {
            console.log(error);
            return response.status(400).send('unable to dispatch password reset');
          }

          response.status(200).send('ok');
        });
      });
    } else {
      response.status(400).send('email-not-found');
    }
  });
};

/**
 * Validate token and show email recovery page.
 */

exports.validateResetLink = function(request, response, next) {
  var token = new Buffer(request.query.token, 'base64').toString();
  var email = token.split(':')[0];
  var resetId = token.split(':')[1];

  User.findOne({
    email: email
  }, function(error, user) {
    if (error) {
      serverStatus.errors.adduser++;
      return next(error);
    }

    if (user && resetId === user.reset_id && Date.now() < user.reset_ttl) {
      request.session.reset = {
        email: email
      };
      response.render('reset', {
        title: 'Hobs Registry - Reset password'
      });
    } else {
      response.redirect('/');
    }
  });
};

/**
 * Reset password and invalidate all tokens associated to the user account.
 */

exports.resetPassword = function(request, response, next) {
  if (!request.session.user && !request.session.reset) {
    return response.redirect('/');
  }

  var newPassword = request.body.pass;
  var email = request.session.user && request.session.user.email ||
    request.session.reset && request.session.reset.email;

  User.findOne({
    email: email
  }, function(error, user) {
    if (error) {
      serverStatus.errors.adduser++;
      return next(error);
    }

    if (user) {
      user.password = newPassword;
      user.reset_id = null;

      user.save(function(error) {
        if (error) {
          serverStatus.errors.adduser++;
          return next(error);
        }

        // purge all user tokens
        blacklist.purge({
          sub: user._id,
          iat: Date.now()
        }, function(error) {
          if (error) {
            serverStatus.errors.jwtBlacklist++;
            return next(error);
          }

          // delete session reset info
          request.session.reset = null;
          response.status(200).send('ok');
        });
      });
    } else {
      response.status(400).send('unable to update password');
    }
  });
};
