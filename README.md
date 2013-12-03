# connect-bower #

Middleware for serving content from bower packages.

# Why #

Scratching my own itch really. We use bower for packaging all of our front-end resources, and we wanted a simple and consistent way to access these packages from a browser.

# How #

Simple. When `connect-bower` get's hit with a correctly formatted URL it will download (if needed) the correct package (versioned) and then serve any file from within this package.

# Use #

The absolutely simplest way to use the middleware looks like this:

```javascript
require("connect")()
	.use(require("connect-bower")())
	.listen(8080);
```

# Examples #

The general match rule for path is `/:package/:version/:path` where

* `:package` is a bower package name
* `:version` is a semver version or range or a straight up SHA1 commit
* `:path` is a path to any file in the package

```
/troopjs/2.1.0/package.json
```

Serve the file `package.json` from the package `troopjs` version `2.1.0`

```
/troopjs/*/package.json
```

Serve the file `package.json` from the package `troopjs` of the latest version available

```
/troopjs/~2/package.json
```

Serve the file `package.json` fro the package `troopjs` of the latest version matching `~2`

```
/troopjs/develop/package.json
```

Serve the file `package.json` from the package `troopjs` in the `develop` branch

```
/troopjs/7703e4912c46abd81f32aad9886f19fc3c1a1f2c/package.json
```

Serve the file `package.json` from the package `troopjs` as in commit `7703e4912c46abd81f32aad9886f19fc3c1a1f2c`