module.exports = {
  port: 3000,
  bind: '0.0.0.0',
  host: '127.0.0.1:3000',
  secure: false,

  skipValidation: false,
  skipNormalization: false,

  tmpDir: '/tmp',
  maxSize: 1000000,

  token: {
    secret: 'secret_token',
    expiresIn: '30d',
  },

  database: {
    url: 'mongodb://127.0.0.1:27017/reg_dev',
  },

  memcached: {
    servers: ['127.0.0.1:11211'],
    username: null,
    password: null,
  },

  mailer: {
    transport: 'smtp',
    options: {
      url: null,
    }
  },
};
