# [1.1.0](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/compare/v1.0.0...v1.1.0) (2026-01-24)


### Bug Fixes

* **dependencies:** update package overrides for lodash, hono, diff, and undici ([9ce06ac](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/commit/9ce06acf767d9d89906e4c31f3f5e6dd74bb6ad2))
* **env:** actualizar variables de entorno para el servicio BFF ([f39eab9](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/commit/f39eab9e67acb75955da4d15d2bb6d6d018b5220))


### Features

* **auth:** implement JWT authentication middleware and user driver ([60b1471](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/commit/60b14714c2fc769458d0a885aef79dc62a883b4e)), closes [#3](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/issues/3)
* **auth:** implementar cliente OAuth2 con métodos para autorización y gestión de tokens ([5812731](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/commit/5812731efe80ec94db2006a2c3647c1c1cfd71dd))
* **ci:** add BFF_CLIENT_SECRET environment variable for Docker build ([38111f6](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/commit/38111f6287ca4f3cce1c3551caeb6627e43a83bd))
* **ci:** add BFF_CLIENT_SECRET to environment variables and update test command to use CI ([2d768ea](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/commit/2d768eacf6fcb33c4b50e1fe41cc408950f5d569))
* **test:** Implement JWT and OAuth functionality with comprehensive unit tests ([b02655f](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/commit/b02655fe9358b1dfa1cc7d2ff1741ccf2cff05da))
* **tests:** add integration tests for OAuth2 BFF and JWKS handling ([f12803d](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/commit/f12803df786cb2161dd2e4cc73b5f1d8ae57b47d)), closes [#5](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/issues/5) [#6](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/issues/6)
* **user:** add user information DTO and use case for retrieving current user data ([edf9947](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/commit/edf9947d98b3a78f982de7ea14599dc217b43bd2)), closes [#4](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/issues/4)

# 1.0.0 (2026-01-13)


### Bug Fixes

* **dependencies:** update tmp package version and add overrides ([30cf0e2](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/commit/30cf0e2919f185c0f13bdd13b08b1d7f5c4b140f))


### Features

* **project:** clone code for F0 from OAuth2 ([f8afa48](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/commit/f8afa485670a4f4a5fa71e62aa52eb4a741d273c))
* **tests:** enhance CORS middleware tests with path exclusion logic ([238c6cc](https://github.com/JRuvalcabaFSD/ByteBerry-BFF/commit/238c6ccd4a9defb33840064274bbf3bbd6e61149))
