# Hobs Registry

![status-stable](https://img.shields.io/badge/status-stable-green.svg)
[![Build Status](https://travis-ci.org/crambit/hobs-registry.svg?branch=master)](https://travis-ci.org/crambit/hobs-registry)

Quarry is [Hobs](https://github.com/crambit/hobs)' community repository for
packages, currently hosted at [quarry.crambit.com](https://quarry.crambit.com).
The registry can also be used internally in your organization, behind the firewall.

## Requirements

- Node.js 0.10+
- MongoDB 2.6+
- Memcached 1.4.0+

## Installation

```
$ npm install hobs-registry
```

## API function list

### Find packages

```
$ curl https://quarry.crambit.com/api/packages?q=zeta-server
```

### List packages

```
$ curl https://quarry.crambit.com/api/packages?direction=desc&sort=downloads
```

Response

```json
[
  {
    "_id": "56d4c6b4a8a954b4210ff930",
    "name": "zeta-server",
    "description": "Zeta server monitoring",
    "tags": [ "#zeta" ],
    "owner": {
      "_id": "56cc29c42b445817e010c45b",
      "name": "bob",
      "email": "bob@example.com"
    },
    "latest_version": "0.1.0",
    "url": "https://github.com/elafleur/zeta-server",
    "created_at": "2015-12-02T13:28:38.108Z",
    "updated_at": "2015-12-02T13:28:38.108Z",
    "downloads": 23
  },
]
```

### Download package

```
$ curl https://quarry.crambit.com/api/packages/zeta-server/download?version=latest \
     -o zeta-server.tar.gz
```

### Publish package

```
$ curl -X POST https://quarry.crambit.com/api/packages \
     -H "Authorization: Bearer <JSON_Web_Token>" \
     --data-binary "@horuspack.tar.gz"
```

or

```
$ curl -X POST https://quarry.crambit.com/api/packages \
     -H "Authorization: Bearer <JSON_Web_Token>" \
     -d url=https://github.com/elafleur/zeta-server
```

### Unpublish package

```
$ curl -X DELETE https://quarry.crambit.com/api/packages \
     -H "Authorization: Bearer <JSON_Web_Token>" \
     -d name=zeta-server
```

It is generally considered bad behavior to remove a package that others are depending on!

### Register

```
$ curl -X POST https://quarry.crambit.com/api/users \
     -d name=jack \
     -d email=jack@example.net \
     -d password=secret_password
```

### Login

```
$ curl -X POST https://quarry.crambit.com/api/users \
     -u username:password
```

Response

```json
  {
    "name": "jack",
    "registry": "quarry.crambit.com",
    "token": "<JSON_Web_Token>"
  }
```

### Logout

```
$ curl -X POST https://quarry.crambit.com/api/users/logout \
     -H "Authorization: Bearer <JSON_Web_Token>"
```

This will invalidate the current token associated to your user on the registry.

## Configuration

| Key                  | Description                 | Default Value                       |
| -------------------- | --------------------------- | ----------------------------------- |
| `port`               | Listening port              | 3000                                |
| `bind`               | Bind address                | '0.0.0.0'                           |
| `host`               | External host address       | 'localhost:3000'                    |
| `secure`             | Secure protocol (https)     | false                               |
| `skipValidation`     | Skip checking repo via git  | false                               |
| `skipNormalization`  | Leave ssh URLs as is        | false                               |
| `tmpDir`             | Temp directory              | '/tmp'                              |
| `maxSize`            | Package size limit in bytes | 1000000                             |
| `token.secret`       | Secret to sign JWTs         | 'secret_token'                      |
| `token.expiresIn`    | JWTs TTL                    | '30d'                               |
| `database.url`       | MongoDB address             | 'mongodb://127.0.0.1:27017/reg_dev' |
| `memcached.servers`  | Memcached server addresses  | ['127.0.0.1:11211']                 |
| `memcached.username` | Memcached username          | null                                |
| `memcached.password` | Memcached password          | null                                |
| `mailer.transport`   | Transport configuration     | 'smtp'                              |
| `mailer.options.url` | Transporter options         | null                                |

## Testing

Make sure you installed MongoDB and Memcached and properly configured `config/test.js`, and then:

```
$ NODE_ENV=test npm test
```

## License

[MIT](LICENSE)
