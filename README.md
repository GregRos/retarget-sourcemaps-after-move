# retarget-source-maps

This is script meant as a post-build or pre-publish step. It's used to retarget sourcemap files after the dist and src folder structure has been changed, correcting the links between the two.

You can use it if your project folder looks like this:

```
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

But you want to publish your package as this:

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

This script doesn't actually move files around; it assumes you did that part already. All it does is go over `.js.map` files  and `//# sourcMappingURL` comments in JS files and fixes them based on the new folder structure.

Some things it doesn't support right now:

1. Inline source-maps.
2. `//# sourceURL` comments.
3. Separate map file folders. It assumes all map files are kept in the same folder as the dist file.