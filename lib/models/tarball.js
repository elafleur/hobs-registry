'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Tarball schema.
 */

var TarballSchema = new Schema({
  package: {
    type: Schema.Types.ObjectId,
    ref: 'Package',
    required: true
  },
  version: {
    type: String,
    required: true
  },
  depends: [String],
  data: {
    type: Buffer,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  hash: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

/**
 * Validations.
 */

TarballSchema.path('version').validate(function(version) {
  if (version) {
    return (/^\d{1,2}\.\d{1,2}$/.test(version));
  }
}, 'This is not a valid "BIG.SMALL" version.');

module.exports = mongoose.model('Tarball', TarballSchema);
