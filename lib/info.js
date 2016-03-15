'use strict';

var extend = require('extend');
var format = require('util').format;
var request = require('./request');
var util = require('./util');
var debug = require('debug')('lego-client:info');

/*
  info(args, config)

  * args
    * name: the package name
    * version: the package version
  * config: see client.config
*/

module.exports = function* info(args, config) {
  args = extend({}, require('./config')(), config, args);

  // 1. 获得所有的包信息
  var req = {};
  req.url = format('%s/repository/%s/', args.registry, args.name);
  req.method = 'GET';
  req.json = true;

  debug('get package info %s@%s~%s url %s', args.name, args.version || '-', args.tag || '-', req.url);
  var res = yield* request(req);

  util.errorHandle(req, res);

  // 2. 获得目标版本
  var targetVersion = getTargetVersion(res.body, args);

  // 3. 通过目标版本获得包信息
  var body = res.body.packages[targetVersion];
  if (!body) {
    var err = new Error('no matched package ' + args.name + (args.version ? ' ~ ' + args.version : ''));
    err.statusCode = res.statusCode;
    throw err;
  }
  debug('response body %j', body);

  // 4. 返回结果
  return body;
};

/**
 * 根据算法，获得指定版本
 * http://stackoverflow.com/questions/22343224/difference-between-tilde-and-caret-in-package-json
 * http://fredkschott.com/post/2014/02/npm-no-longer-defaults-to-tildes/
 */
function getTargetVersion(body, args) {
  var versionArr = Object.keys(body.packages),
      argsVersion = args.version || 'stable';

  argsVersion = argsVersion.trim();

  // 如果package.json中配置了db:*，则返回最新版本
  if(argsVersion == '*'){
    // 获取最新
  }

  // db 或 db@stable: lego install db或者lego install db@stable
  else if(argsVersion.indexOf('.') < 0){
    versionArr = versionArr.filter(function(cur) {
      return body.packages[cur].tag === argsVersion;
    });
  }

  // 如果package.json中配置了db:~1.2.3，则返回 1.2.*<= version < 1.3.*
  // 但有特例，以0开始的版本，db:~0.1.2 和 db:^0.1.2，都返回 0.1.x <= version < 0.2.*
  else if (argsVersion.indexOf('~') === 0 || argsVersion.indexOf('^0') === 0) {
    // 只要比较第一位和第二位数字相同即可
    var targetArr = getArrFromVersion(argsVersion.substr(1));
    if (targetArr.length > 1) {
      versionArr = versionArr.filter(function(cur) {
        var curArr = getArrFromVersion(cur);
        return curArr.length > 1 && curArr[0] === targetArr[0] && curArr[1] === targetArr[1];
      });
    }
  }

  // 如果package.json中配置了db:^1.2.3，则返回 1.2.*<= version < 2.*.*
  // 但有特例，以0开始的版本，db:~0.1.2 和 db:^0.1.2，都返回 0.1.x <= version < 0.2.*
  else if (argsVersion.indexOf('^') === 0) {
    // 只要比较第一位和第二位数字相同即可
    var targetArr = getArrFromVersion(argsVersion.substr(1));
    if (targetArr.length > 1) {
      versionArr = versionArr.filter(function(cur) {
        var curArr = getArrFromVersion(cur);
        return curArr.length > 1 && curArr[0] === targetArr[0];
      });
    }
  }

  // 其他情况只考虑指定版本，例如 lego install db@1.2.3或者在package.json中定义了db:1.2.3
  else {
    versionArr = versionArr.filter(function(cur) {
      return cur === argsVersion;
    });
  }

  // 排序使版本号从大到小
  versionArr.sort(function(a, b) {
    var aArr = a.split('.'),
        bArr = b.split('.');

    for (var i = 0; i < 3; i++) {
      var na = parseInt(aArr[i], 10),
          nb = parseInt(bArr[i], 10);

      if (na > nb) {
        return -1;
      } else if (na < nb) {
        return 1;
      }
    }

    return 0;
  });

  // 返回排序之后的最大的版本号
  return versionArr[0];
}

function getArrFromVersion(version) {
  return version.split('.');
}
