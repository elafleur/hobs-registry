'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Package schema.
 */

var PackageSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  latest_version: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  tags: [String],
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  url: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  downloads: {
    type: Number,
    default: 0
  }
});

/**
 * Validations.
 */

PackageSchema.path('latest_version').validate(function(version) {
  if (version) {
    return (/^\d{1,2}\.\d{1,2}$/.test(version));
  }
}, 'This is not a valid "BIG.SMALL" version.');

/**
 * Indexes.
 */

PackageSchema.index({
  name: 'text',
  tags: 'text',
  description: 'text'
}, {
  name: 'TextIndex',
  weights: {
    name: 10,
    tags: 5,
    description: 1
  }
});

module.exports = mongoose.model('Package', PackageSchema);
