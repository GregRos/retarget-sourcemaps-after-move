# Retarget-source-maps

Say you're writing a JS project with fairly complex directory structure, `src` and `dist` folders, and source maps. For example:

```
root
|- src
	|- lib
		|- index.ts
		|- advanced.ts
	|- test
		|...
|- dist
	|- lib
		|- index.js
		|- index.js.map
		|- index.d.ts
		|- advanced.js
		|- advanced.js.map
		|- advanced.d.ts
	|- test
		|...
|- package.json
|- readme.md
|- .gitignore
|- ide-file.ide
|...
```

You want users to be able to easily access your package in spite of its complex directory structure. You don't want them to do this:

```javascript
const awesomePackage = require("awesome-package/dist/lib");
```

You want them to do this:

```js
const awesomePackage = require("awesome-package");
```

So you set up your `package.json` with:

```js
main: "dist/lib/index.js"
```

This solves the above problem. But if you have an internal module like `advanced.js` that you want to be user-accessible, users will still need to access it like this:

```js
const pkgawesomePackage= require("awesome-package/dist/lib/advanced");
```

Which seems pretty ugly.

One solution to this would be to just move files around during the publish step to transform the package into something like this:

```
|- index.js
|- index.d.ts
|- index.js.map
|- advanced.js
|- advanced.d.ts
|- advanced.js.map
|- readme.md
|- package.json
|- src
	|- lib
		|- index.ts
		|...
```

Simple enough, but the problem is the source maps. If you change the directory structure, the source maps will be all wrong and won't work properly. Also, 

