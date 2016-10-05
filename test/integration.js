/*jshint expr: true*/

delete require.cache[require.resolve('config')];

var fs = require('fs');
var path = require('path');
var request = require('request');
var expect = require('chai').expect;
var spawn = require('child_process').spawn;

// load mongoose models
fs.readdirSync(path.resolve(__dirname, '../lib/models/')).forEach(function(model) {
  require('../lib/models/' + model);
});

var config = require('config');
var database = require('../lib/database');

var horusServerUrl = 'http://127.0.0.1:' + config.get('port');

describe('registry server', function() {
  var server = null;
  var token = null;

  before(function(done) {
    database.dropDatabase(function(err) {
      if (err) {
        console.error(err);
      }

      server = spawn('node', ['server.js']);

      server.stderr.on('data', function(data) {
        console.error(data.toString());
      });

      server.stdout.on('data', function(data) {
        if (data.toString().match('ready\.')) {
          // create test user
          request.post(horusServerUrl + '/api/users', {
            form: {
              'name': 'test',
              'email': 'test@example.com',
              'password': '1234test'
            }
          }, function(err, res, body) {
            token = JSON.parse(body).token;
            done();
          });
        }
      });
    });
  });

  after(function() {
    server.kill();
  });

  describe('headers', function() {
    it('should support CORS', function(done) {
      request.get(horusServerUrl + '/status', function(err, res, body) {
        expect(res.headers['access-control-allow-origin']).not.to.be.null;
        done();
      });
    });
  });

  describe('routes', function() {
    describe('/status', function() {
      it('should return 200 when server is running', function(done) {
        request.get(horusServerUrl + '/status', function(err, res, body) {
          expect(res.statusCode).to.equal(200);
          done();
        });
      });
    });

    describe('/api/packages', function() {
      beforeEach(function(done) {
        done();
      });

      it('should properly setup database so status is 200', function(done) {
        request.get(horusServerUrl + '/api/packages', function(err, res, body) {
          expect(res.statusCode).to.equal(200);
          done();
        });
      });

      it('should error when POSTing a too big package tar.gz to /api/packages', function(done) {
        var r = request.post({
          url: horusServerUrl + '/api/packages',
          headers: {
            Authorization: 'Bearer ' + token
          }
        });

        var stream = fs.createReadStream(path.join(__dirname, 'fixtures/horuspack_toobig.tar.gz'))
          .pipe(r);

        var hadError = false;
        stream.on('error', function(err) {
          hadError = true;
        });
        stream.on('end', function() {
          expect(hadError).to.eq(false);
        });
        r.on('response', function(res) {
          expect(res.statusCode).to.eq(400);
          done();
        });
      });

      it('should error when POSTing a tar.gz without an horus.json file to /api/packages', function(done) {
        var r = request.post({
          url: horusServerUrl + '/api/packages',
          headers: {
            Authorization: 'Bearer ' + token
          }
        });

        var stream = fs.createReadStream(path.join(__dirname, 'fixtures/horuspack_nohorusjson.tar.gz'))
          .pipe(r);

        var hadError = false;
        stream.on('error', function(err) {
          hadError = true;
        });
        stream.on('end', function() {
          expect(hadError).to.eq(false);
        });
        r.on('response', function(res) {
          expect(res.statusCode).to.eq(400);
          done();
        });
      });

      it('should create a package when POSTing a tar.gz to /api/packages', function(done) {
        var r = request.post({
          url: horusServerUrl + '/api/packages',
          headers: {
            Authorization: 'Bearer ' + token
          }
        });

        var stream = fs.createReadStream(path.join(__dirname, 'fixtures/horuspack.tar.gz'))
          .pipe(r);

        var hadError = false;
        stream.on('error', function(err) {
          hadError = true;
        });
        stream.on('end', function() {
          expect(hadError).to.eq(false);
        });
        r.on('response', function(res) {
          expect(res.statusCode).to.eq(201);
          done();
        });
      });

      it('should error when a package version has already been registered', function(done) {
        var r = request.post({
          url: horusServerUrl + '/api/packages',
          headers: {
            Authorization: 'Bearer ' + token
          }
        });

        var stream = fs.createReadStream(path.join(__dirname, 'fixtures/horuspack.tar.gz'))
          .pipe(r);

        var hadError = false;
        stream.on('error', function(err) {
          hadError = true;
        });
        stream.on('end', function() {
          expect(hadError).to.eq(false);
        });
        r.on('response', function(res) {
          expect(res.statusCode).to.eq(400);
          done();
        });
      });

      it('should properly fetch packages', function(done) {
        request.get(horusServerUrl + '/api/packages', function(err, res, body) {
          expect(res.statusCode).to.eq(200);

          var pack = JSON.parse(body)[0];
          expect(pack.name).to.eql('health');
          expect(pack.owner.name).to.eql('test');
          expect(pack.owner.email).to.eql('test@example.com');
          expect(pack.url).to.eql('https://github.com/elafleur/horuspack-health');
          done();
        });
      });

      it('should properly fetch packages list', function(done) {
        request.get(horusServerUrl + '/api/packages.list', function(err, res, body) {
          expect(res.statusCode).to.eq(200);
          expect(body).to.match(/Package: health\nMaintainer: test <test@example.com>\nVersion: .*\nDescription: .*\nDepends: \nTags: .*\nUrl: https:\/\/github.com\/elafleur\/horuspack-health\nSize: .*\nSHA256: .*\n/);
          done();
        });
      });

      it('should properly fetch packages index', function(done) {
        request.get(horusServerUrl + '/api/packages.index', function(err, res, body) {
          expect(res.statusCode).to.eq(200);
          expect(body).to.match(/health@.*\[.*\-.*\]\n/);
          done();
        });
      });

      it('should properly fetch one package', function(done) {
        request.get(horusServerUrl + '/api/packages/health', function(err, res, body) {
          expect(res.statusCode).to.eq(200);

          var pack = JSON.parse(body);
          expect(pack.name).to.eql('health');
          expect(pack.owner.name).to.eql('test');
          expect(pack.owner.email).to.eql('test@example.com');
          expect(pack.url).to.eql('https://github.com/elafleur/horuspack-health');
          done();
        });
      });

      it.skip('should allow searches by GETting /api/packages?q=name', function(done) {
        var url = horusServerUrl + '/api/packages?q=health';

        request.get(url, function(err, res, body) {
          expect(res.statusCode).to.eq(200);

          var pack = JSON.parse(body)[0];
          expect(pack.name).to.eql('health');
          expect(pack.owner.name).to.eql('test');
          expect(pack.owner.email).to.eql('test@example.com');
          expect(pack.url).to.eql('https://github.com/elafleur/horuspack-health');
          done();
        });
      });

      it('should properly remove one package', function(done) {
        request.delete({
          url: horusServerUrl + '/api/packages',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'health',
          })
        }, function(err, res, body) {
          expect(res.statusCode).to.eq(204);
          done();
        });
      });

      it('should create a package when POSTing a URL to /api/packages', function(done) {
        this.timeout(15000);

        request.post({
          url: horusServerUrl + '/api/packages',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: 'https://github.com/elafleur/horuspack-redis.git',
          })
        }, function(err, res, body) {
          expect(res.statusCode).to.eq(201);
          done();
        });
      });

      it('should not create a package when an invalid URL is provided', function(done) {
        request.post({
          url: horusServerUrl + '/api/packages',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: 'horuspack-health.com',
          })
        }, function(err, res, body) {
          expect(res.statusCode).to.eq(400);
          done();
        });
      });
    });

    describe('/api/users', function() {
      beforeEach(function(done) {
        done();
      });

      it('should return 200 when invalidating an active token', function(done) {
        request.post({
          url: horusServerUrl + '/api/users/logout',
          headers: {
            Authorization: 'Bearer ' + token
          }
        }, function(err, res, body) {
          expect(res.statusCode).to.eq(200);
          done();
        });
      });

      it('should error when a token has already been invalidated', function(done) {
        request.post({
          url: horusServerUrl + '/api/users/logout',
          headers: {
            Authorization: 'Bearer ' + token
          }
        }, function(err, res, body) {
          expect(res.statusCode).to.eq(401);
          done();
        });
      });

      it('should error on a user unsuccessful login attempt', function(done) {
        request.post({
          url: horusServerUrl + '/api/users',
          auth: {
            user: 'test',
            pass: 'wrong_pwd'
          }
        }, function(err, res, body) {
          expect(res.statusCode).to.eq(403);
          done();
        });
      });

      it('should return a token when a user successfully logs in', function(done) {
        request.post({
          url: horusServerUrl + '/api/users',
          auth: {
            user: 'test',
            pass: '1234test'
          }
        }, function(err, res, body) {
          expect(res.statusCode).to.eq(200);

          var info = JSON.parse(body);
          expect(info.name).to.eql('test');
          expect(info.registry).to.exist;
          expect(info.token).to.exist;
          done();
        });
      });
    });
  });

});
