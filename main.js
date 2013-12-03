module.exports = function (config) {
	"use strict";

	var _ = require("lodash");
	var q = require("q");
	var xregexp = require("xregexp").XRegExp;
	var url = require("url");
	var send = require("send");
	var bower = require("bower");

	var re = xregexp("/(?<package>[^/]+)/(?<version>[^/]+)/(?<path>.+)");
	var map = {
		"version": "tag",
		"commit": "commit",
		"branch": "branch"
	};
	var maxage = 1000 * 60 * 60 * 24;

	config = _.defaults(config || {}, {
		"maxage": {
			"version": maxage,
			"commit": maxage,
			"branch": 0
		}
	});

	return function (request, response, next) {
		var pathname = url.parse(request.url).pathname;
		var matches = xregexp.exec(pathname, re);

		q.promise(function (resolve, reject, notify) {
			if (matches === null) {
				reject({
					"code": "EPARSE",
					"toString": function () {
						return "Unable to parse package/version/path";
					}
				});
			}
			else {
				bower.commands
					.info(matches.package + "#" + (bower.config.offline ? decodeURI : decodeURIComponent)(matches.version), null, config)
					.on("error", reject)
					.on("log", notify)
					.on("end", function (info) {
						var decoded_version = decodeURIComponent(matches.version);
						var resolve_version = info.version || info.latest && info.latest.version || decoded_version;

						if (resolve_version !== decoded_version) {
							response.statusCode = 302;
							response.setHeader("Location", xregexp.replace(pathname, re, "/${package}/" + encodeURIComponent(resolve_version) + "/${path}"));
							response.end("Redirecting to " + response.getHeader("Location"));
						}
						else {
							bower.commands
								.cache.list([ matches.package ], null, config)
								.on("error", reject)
								.on("log", notify)
								.on("end", function (entries) {
									var entry = _.find(entries, function (entry) {
										var _resolution = entry.pkgMeta._resolution;
										var type = _resolution.type;

										return _resolution[map[type] || type] === decoded_version;
									});

									if (entry) {
										resolve(entry);
									}
									else {
										reject({
											"code": "ENOCACHE",
											"toString": function () {
												return "Unable to find cache entry for version " + decoded_version;
											}
										});
									}
								});
						}
					});
			}
		})
			.done(function (entry) {
				send(request, matches.path)
					.root(entry.canonicalDir)
					.maxage(config.maxage[entry.pkgMeta._resolution.type] || 0)
					.pipe(response);
			}, function (error) {
				switch (error.code) {
					case "EPARSE":
						response.statusCode = 400;
						break;

					case "ENOCACHE":
					case "ENOTFOUND":
					case "ENORESTARGET":
						response.statusCode = 404;
						break;
				}

				next(error.toString());
			});
	};
};