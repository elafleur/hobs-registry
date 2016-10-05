var assert = require('chai').assert;
var Mailer = require('../lib/mailer');


describe('send mail', function() {
  var mailer = new Mailer();

  it('should send a valid email', function(done) {
    var options = {
      to: 'to@to.com',
      from: 'from@from.com',
      subject: 'subject',
      text: 'text',
      html: '<h1>html</h1>',
    };

    mailer.sendMail(options, function(err, mail) {
      assert(!err);
      assert(mail.response);
      assert(mail.envelope);
      assert(mail.messageId);

      done(err);
    });
  });

});
