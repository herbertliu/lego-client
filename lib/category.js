'use strict';

var extend = require('extend');
var request = require('./request');
var util = require('./util');

/*
  category(args, config)

  * args
    * registry: the registry
  * config: see client.config
*/

module.exports = function* category(args, config) {
	
  args = extend({}, require('./config')(), config, args);

  var req = {};
  req.url = args.registry + '/category';
  req.method = 'GET';
  req.json = true;
  req.auth = args.auth;

  var res = yield* request(req);
  util.errorHandle(req, res);
  return res.body;
};
