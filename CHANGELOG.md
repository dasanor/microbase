# MicroBase Change Log

All notable changes to this project will be documented in this file.

MicroBase is in a pre-1.0 state. This means that its APIs and behavior
are subject to breaking changes without deprecation notices. Until 1.0,
version numbers will follow a [Semver][]-ish `0.y.z` format, where `y`
is incremented when new features or breaking changes are introduced,
and `z` is incremented for lesser changes or bug fixes.

## [0.7.2][] (2016-09-25)

* Load operations from folders, assuming the file name as the operation name.
* Remove submodules. Add script to run in docker compose.
* New "micro:config" to show effective service configuration
* Updated ecomm example data to RPC.
* Updated examples.

## [0.7.1][] (2016-08-17)

* Replaced good-console with hapi-good-winston to unify loggers.
* New documentation layout.
* Removed Boom.
* Enhanced docs. Moving from aglio to markup.

## [0.7.0][] (2016-07-14)

* Updated documentation
* Changed name to microbase

## [0.6.1][] (2016-07-12)

* Switched the events service with a more modular 'bus' with amqp support.
* Slightly improve the documentation for workers, events and server side cache.

## [0.6.0][] (2016-07-06)

* Added middleware utility
* Use native promises un mongoose
* Added cache service.
* Added caching to the operations response (server side caching)
* Update db instructions and examples in readme
* Added generic error response to utils
* Created a generic data import tool for products, categories & taxes
* Updated sampleData for Fridges (with classifications) and Shoes (with variants)
* Added taxes sample data
* Added Open Software License v. 3.0 (OSL-3.0)
* Added 'headers' as a configuration option in service calls.
* Added utils service.
* Added CORS configuration

## [0.5.0][] (2016-06-07)
* Added sample data creation script
* Refactored the events payload to add message type
* Remove security from ping operation
* Updated readme
* Updated ecomm submodules (from develop)

## [0.4.0][] (2016-06-04)
* Added local events service
* Added Search service with Elasticsearch
* Remove multiple crons per worker.
* Added ability to launch a job on demand.
* Allow rest urls calls in Services service.
* Added doc/test scripts
* Moved src files to their own folder
* Added ecomm services as submodules (forgive me...)
* Added ecomm package file
* Added ecomm Docker composer file
* Added ecomm API documentation
* Added Cart perf test files
* Added query parameters to the operation payload
* Removed generated docs from git

## [0.3.1][] (2016-05-30)

* JWT token verification.
* Token pass to downstream services.
* CID creation.

## [0.3.0][] (2016-05-26)

* Added docker examples
* Improved documentation

## [0.2.4][] (2016-05-25)

* Simplified jobs definition
* Added "data" section to error responses
* Allow the server to start under the 'lab' testing tool
* Added option to use REST style endpoints.
* Added two example services
* Restored the "ping" operation

## [0.2.3][] (2016-05-20)

* Improve documentation

## [0.2.2][] (2016-05-19)

* Initial Workers service based on [cron](https://github.com/ncb000gt/node-cron) and [monq](https://github.com/scttnlsn/monq)

## [0.2.1][] (2016-05-19)

* Services service
  * Added a `loadModule` method, to define several operations at once
* Logger service
  * Added `isDebugEnabled` helper method

## [0.2.0][] (2016-05-14)

* Services service
  * Changed seneca in favor of [hapi](https://github.com/hapijs/hapi) to define and call services
* Initial DB service based on [mongoose](https://github.com/Automattic/mongoose)

## [0.1.2][] (2016-05-11)

* Application bootstrap
* Initial Config service based on [nconf](https://github.com/indexzero/nconf)
* Initial Logger service based on [winston](https://github.com/winstonjs/winston)
* Initial Services service based on [seneca](https://github.com/senecajs/seneca)
* Added JSON Schema validation with [tv4](https://github.com/geraintluff/tv4)
