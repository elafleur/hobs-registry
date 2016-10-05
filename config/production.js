module.exports = {
  port: process.env.OPENSHIFT_NODEJS_PORT,
  bind: process.env.OPENSHIFT_NODEJS_IP,
  host: process.env.OPENSHIFT_APP_ALIAS,
  secure: true,

  tmpDir: process.env.OPENSHIFT_TMP_DIR,

  token: {
    secret: process.env.OPENSHIFT_SECRET_TOKEN,
    expiresIn: '10y',
  },

  database: {
    url: process.env.MONGOLAB_URI,
  },

  memcached: {
    servers: process.env.MEMCACHEDCLOUD_SERVERS.split(','),
    username: process.env.MEMCACHEDCLOUD_USERNAME,
    password: process.env.MEMCACHEDCLOUD_PASSWORD,
  },

  mailer: {
    transport: 'sparkpost',
    options: {
      sparkPostApiKey: process.env.SPARKPOST_API_KEY,
    }
  }
};
