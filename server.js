'use strict';

var express = require('express');
var cors = require('cors');
var config = require('config');
var morgan = require('morgan');
var uuid = require('node-uuid');
var cookieSession = require('cookie-session');
var compression = require('compression');
var bodyParser = require('body-parser');
var fs = require('fs');

var app = express();

app.enable('strict routing');
app.options('*', cors());

/**
 * Set up views.
 */

app.set('views', __dirname + '/lib/views');
app.set('view engine', 'jade');

/**
 * Redirect on https if 'secure' is set to 'true' in the config.
 */

if (config.get('secure')) {
  app.use(function(req, res, next) {
    var isHttps = req.secure;

    if (!isHttps) {
      isHttps = (req.headers['x-forwarded-proto'] || '').substring(0, 5) === 'https';
    }

    if (!isHttps) {
      if (req.method === 'GET' || req.method === 'HEAD') {
        return res.redirect(301, 'https://' + req.headers.host + req.originalUrl);
      } else {
        return res.status(403).send('Please use HTTPS when submitting data to this server.');
      }
    }
    next();
  });
}

app.use(cors());
app.use(morgan('combined'));
app.use(compression());

/**
 * Use session cookies since session object is relatively small.
 * Session secret is generated randomly on start.
 */

app.use(cookieSession({
  name: 'hreg-session',
  secret: uuid.v4(),
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(express.static(__dirname + '/public'));

/**
 * Load mongoose models.
 */

fs.readdirSync(__dirname + '/lib/models').forEach(function(model) {
  require('./lib/models/' + model);
});

/**
 * Load routes.
 */

app.use(require('./lib/routes'));

/**
 * Start express server.
 */

app.listen(config.get('port'), config.get('bind'), function() {
  console.log('Running on port ' + config.get('port') + ' and using database at ' + config.get('database.url') + '.');
});

/**
 * Tests look for this string to make sure the server is loaded.
 */

console.log('ready.');
