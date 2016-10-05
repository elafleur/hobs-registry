'use strict';

var nodemailer = require('nodemailer');
var config = require('config');

var transports = {
  'smtp': 'nodemailer-smtp-transport',
  'sparkpost': 'nodemailer-sparkpost-transport',
  'stub': 'nodemailer-stub-transport',
};

/**
 * Initialize a new mailer.
 *
 * @api public
 */

function Mailer() {
  var transportPluginName = transports[config.get('mailer.transport')] || 'smtp';
  var transportPlugin = require(transportPluginName);

  // load the configured transporter
  this.transporter = nodemailer.createTransport(transportPlugin(config.get('mailer.options')));
}

/**
 * Write password reset email.
 *
 * @param {String} name
 * @param {String} email
 * @param {String} resetId
 * @return {Object}
 * @api public
 */

Mailer.prototype.writeMail = function(name, email, resetId) {
  var link = config.get('secure') ?
    'https://' : 'http://';
  link += config.get('host');
  link += '/reset-password?token=' + new Buffer(email + ':' + resetId).toString('base64');

  var html = '<html><body>';
  html += 'Hello ' + name + ',<br><br>';
  html += 'Use the following link within the next 24 hours to reset your password:<br><br>';
  html += link + '<br><br>';
  html += 'Cheers,<br>';
  html += 'The Hobs Registry<br><br>';
  html += '</body></html>';

  var text = 'Hello ' + name + ',\n\n';
  text += 'Use the following link within the next 24 hours to reset your password:\n\n';
  text += link + '\n\n';
  text += 'Cheers,\n';
  text += 'The Hobs Registry\n\n';

  var mailOptions = {
    from: '"Hobs Registry" <no-reply@' + config.get('host') + '>',
    to: email,
    subject: 'Reset your Password',
    text: text,
    html: html
  };

  return mailOptions;
};

/**
 * Send email according to `mailOptions`:
 *
 *  - `from` sender address
 *  - `to` list of receivers
 *  - `subject` subject line
 *  - `text` plaintext body
 *  - `html` html body
 *
 * @param {Object} mailOptions
 * @param {Function} cb
 * @api public
 */

Mailer.prototype.sendMail = function(mailOptions, cb) {
  // send mail with defined transport object
  this.transporter.sendMail(mailOptions, function(err, mail) {
    if (err) {
      return cb(err);
    }

    cb(null, mail);
  });
};

/**
 * Expose the Mailer.
 */

module.exports = Mailer;
