'use strict';

var serverStatus = require('../status');
var blacklist = require('../blacklist');
var config = require('config');
var express = require('express');
var jwt = require('express-jwt');
var rateLimit = require('express-rate-limit');
var router = express.Router();

var secret = config.get('token.secret');
var limiter = rateLimit({
  delayMs: 200,
  windowMs: 5000,
  max: 0
});

var routes = {
  packages: require('./packages'),
  users: require('./users'),
};

router.post('/users', routes.users.adduser);
router.post('/users/logout', jwt({
  secret: secret,
  isRevoked: blacklist.isRevoked
}), routes.users.logout);

router.get('/packages.list', limiter, routes.packages.catalog);
router.get('/packages.index', limiter, routes.packages.catalog);

router.get('/packages', routes.packages.find);
router.post('/packages', jwt({
  secret: secret,
  isRevoked: blacklist.isRevoked
}), routes.packages.createOrUpdate);
router.delete('/packages', jwt({
  secret: secret,
  isRevoked: blacklist.isRevoked
}), routes.packages.remove);

router.get('/packages/:name', routes.packages.fetch);
router.get('/packages/:name/download', routes.packages.download);

router.use(function(request, response) {
  response.status(404).send('Endpoint not found');
});

router.use(function(err, request, response, next) {
  if (err.name === 'UnauthorizedError') {
    serverStatus.errors.jwtVerification++;
    return response.status(401).send(err.message);
  }

  response.status(500).send('Internal server error');

  // log error
  console.log(err);
});

module.exports = router;
