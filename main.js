module.exports = function (config) {
	"use strict";

	var _ = require("lodash");
	var q = require("q");
	var xregexp = require("xregexp").XRegExp;
	var url = require("url");
	var send = require("send");
	var bower = require("bower");

	config = _.defaults(config || {}, {
		"pattern": "/(?<package>[^/]+)/(?<version>[^/]+)/(?<path>.+)",
		"maxage": 1000 * 60 * 60 * 24
	});

	var re = xregexp(config.pattern);

	return function (request, response, next) {
		var pathname = url.parse(request.url, true).pathname;
		var matches = xregexp.exec(pathname, re);

		q.promise(function (resolve, reject, notify) {
			var match_package = decodeURIComponent(matches.package);
			var match_version = decodeURIComponent(matches.version);

			if (matches === null) {
				reject({
					"code": "EPARSE",
					"toString": function () {
						return "Unable to parse package/version";
					}
				});
			}
			else {
				bower.commands
					.info(match_package + "#" + match_version, null, config)
					.on("error", reject)
					.on("log", notify)
					.on("end", function (info) {
						var version = info.version || info.latest && info.latest.version || match_version;

						if (version !== match_version) {
							response.statusCode = 302;
							response.setHeader("Location", xregexp.replace(pathname, re, "/${package}/" + version + "/${path}"));
							response.end("Redirecting to resolved version " + version);
						}
						else {
							bower.commands
								.cache.list([ match_package ], null, config)
								.on("error", reject)
								.on("log", notify)
								.on("end", function (entries) {
									var entry = _.find(entries, function (entry) {
										return (entry.pkgMeta._resolution.type === "version" ? entry.pkgMeta._resolution.tag : entry.pkgMeta._resolution.branch) === version;
									});

									if (entry) {
										resolve(entry);
									}
									else {
										reject({
											"code": "ENOCACHE",
											"toString": function () {
												return "Unable to find cache entry for version " + version;
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
					.maxage(entry.pkgMeta._resolution.type === "version" ? config.maxage : 0)
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