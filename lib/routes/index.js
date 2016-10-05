'use strict';

var express = require('express');
var router = express.Router();

var routes = {
  api: require('./api'),
  root: require('./root'),
  accounts: require('./accounts'),
};

router.use('/api', routes.api);

router.get('/', routes.accounts.login);
router.post('/', routes.accounts.authenticate);

router.get('/signup', routes.accounts.signup);
router.post('/signup', routes.accounts.createAccount);

router.get('/home', routes.accounts.home);
router.post('/home', routes.accounts.updateAccount);

router.post('/logout', routes.accounts.logout);
router.post('/delete', routes.accounts.deleteAccount);

router.post('/lost-password', routes.accounts.lostPassword);

router.get('/reset-password', routes.accounts.validateResetLink);
router.post('/reset-password', routes.accounts.resetPassword);

router.get('/status', routes.root.status);

router.use(function(request, response) {
  response.status(404).render('404', {
    title: 'Page not found'
  });
});

router.use(function(err, request, response, next) {
  response.status(500).render('500', {
    title: 'Internal server error'
  });

  // log error
  console.log(err);
});

module.exports = router;
