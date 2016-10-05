'use strict';

var SshUrl = require('ssh-url');
var Url = require('url');
var config = require('config');
var skipNormalization = config.get('skipNormalization');

/**
 * Normalize git URL.
 *
 * @param {String} suppliedUrl
 * @return {String}
 * @api public
 */

module.exports = function(suppliedUrl) {
  if (skipNormalization) {
    return suppliedUrl;
  }

  var url = suppliedUrl;
  var parsedUrl;

  parsedUrl = Url.parse(suppliedUrl);

  if (!parsedUrl.protocol) {
    parsedUrl = SshUrl.parse(url);
  }

  if (parsedUrl.hostname.match(/((www\.)|^)github.com$/)) {
    var pathname = parsedUrl.pathname;
    var ext;

    pathname = pathname.replace(/\/?$/, '');
    ext = pathname.match(/\.git$/) ?
      '' : '.git';

    url = 'https://github.com' + pathname + ext;
  }

  return url;
};
