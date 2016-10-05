'use strict';

var validator = require('validator');
var bcrypt = require('bcryptjs');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Max of 7 login attempts, resulting in a 15min lock.
 */

var SALT_WORK_FACTOR = 10;
var MAX_LOGIN_ATTEMPTS = 7;
var LOCK_TIME = 15 * 60 * 1000;

/**
 * User schema.
 */

var UserSchema = new Schema({
  full_name: String,
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  login_attempts: {
    type: Number,
    default: 0
  },
  lock_until: Number,
  reset_id: String,
  reset_ttl: Number
});

/**
 * Validations.
 */

UserSchema.path('email').validate(function(email) {
  if (email) {
    return validator.isEmail(email);
  }
}, 'This email address is not valid.');

UserSchema.path('email').validate(function(email, cb) {
  var User = mongoose.model('User');

  // validate only when it is a new user or when email field is modified
  if (this.isNew || this.isModified('email')) {
    User.findOne({
      email: email
    }).exec(function(err, user) {
      cb(!err && !user);
    });
  } else {
    cb(true);
  }
}, 'This email address is already registered.');

UserSchema.path('name').validate(function(name, cb) {
  var User = mongoose.model('User');

  // validate only when it is a new user or when name field is modified
  if (this.isNew || this.isModified('name')) {
    User.findOne({
      name: name
    }).exec(function(err, user) {
      cb(!err && !user);
    });
  } else {
    cb(true);
  }
}, 'This name is already taken.');

UserSchema.path('password').validate(function(password) {
  if (password) {
    return validator.isLength(password, 8);
  }
}, 'Password must be at least 8 characters.');


UserSchema.virtual('isLocked').get(function() {
  // check for a future lock_until timestamp
  return !!(this.lock_until && this.lock_until > Date.now());
});

/**
 * Pre-save hook.
 */

UserSchema.pre('save', function(next) {
  var user = this;

  // only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) {
    return next();
  } else {
    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
      if (err) {
        return next(err);
      }

      // hash the password using our new salt
      bcrypt.hash(user.password, salt, function(err, hash) {
        if (err) {
          return next(err);
        }

        // set the hashed password back on our user document
        user.password = hash;
        next();
      });
    });
  }
});

UserSchema.methods = {
  comparePassword: function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
      if (err) {
        return cb(err);
      }
      cb(null, isMatch);
    });
  },
  inclogin_attempts: function(cb) {
    // if we have a previous lock that has expired, restart at 1
    if (this.lock_until && this.lock_until < Date.now()) {
      return this.update({
        $set: {
          login_attempts: 1
        },
        $unset: {
          lock_until: 1
        }
      }, cb);
    }
    // otherwise we're incrementing
    var updates = {
      $inc: {
        login_attempts: 1
      }
    };

    // lock the account if we've reached max attempts and it's not locked already
    if (this.login_attempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
      updates.$set = {
        lock_until: Date.now() + LOCK_TIME
      };
    }
    return this.update(updates, cb);
  }
};

// expose enum on the model, and provide an internal convenience reference
var reasons = UserSchema.statics.failedLogin = {
  NOT_FOUND: 0,
  PASSWORD_INCORRECT: 1,
  MAX_ATTEMPTS: 2
};

UserSchema.statics = {
  updateAll: function updateAll(params, cb) {
    this.update({}, params, {
      multi: true
    }).exec(cb);
  },
  removeAll: function(cb) {
    this.find().remove().exec(cb);
  },
  getAuthenticated: function(name, password, cb) {
    this.findOne({
      name: name
    }, function(err, user) {
      if (err) {
        return cb(err);
      }

      // make sure the user exists
      if (!user) {
        return cb(null, null, reasons.NOT_FOUND);
      }

      // check if the account is currently locked
      if (user.isLocked) {
        // just increment login attempts if account is already locked
        return user.inclogin_attempts(function(err) {
          if (err) {
            return cb(err);
          }
          return cb(null, null, reasons.MAX_ATTEMPTS);
        });
      }

      // test for a matching password
      user.comparePassword(password, function(err, isMatch) {
        if (err) {
          return cb(err);
        }

        // check if the password was a match
        if (isMatch) {
          // if there's no lock or failed attempts, just return the user
          if (!user.login_attempts && !user.lock_until) {
            return cb(null, user);
          }
          // reset attempts and lock info
          var updates = {
            $set: {
              login_attempts: 0
            },
            $unset: {
              lock_until: 1
            }
          };
          return user.update(updates, function(err) {
            if (err) {
              return cb(err);
            }
            return cb(null, user);
          });
        }

        // password is incorrect, so increment login attempts before returning
        user.inclogin_attempts(function(err) {
          if (err) {
            return cb(err);
          }
          return cb(null, null, reasons.PASSWORD_INCORRECT);
        });
      });
    });
  }
};

module.exports = mongoose.model('User', UserSchema);
