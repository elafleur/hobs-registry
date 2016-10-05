module.exports = {
  port: 3002,
  host: '172.17.0.1:3002',

  database: {
    url: 'mongodb://mongo:27017/reg_docker',
  },

  memcached: {
    servers: ['memcache:11211'],
  },

  mailer: {
    transport: 'stub',
  },
};
