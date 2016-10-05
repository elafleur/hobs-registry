module.exports = {
  port: 3001,
  host: '127.0.0.1:3001',

  database: {
    url: 'mongodb://127.0.0.1:27017/reg_test',
  },

  mailer: {
    transport: 'stub',
  },
};
