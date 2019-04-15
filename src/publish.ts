import * as path from "path";
import {fixSourcemaps} from "./lib";
import shjs = require("shelljs")
let srcRoot = path.resolve("src/lib");

let pubDir = ".tmp/publish";
shjs.rm("-rf", pubDir);
shjs.mkdir("-p", pubDir);
shjs.cp("-r", [
    "package.json",
    "LICENSE.md",
    "README.md"
], pubDir);

shjs.cp("-r", "dist/lib/.", pubDir);
shjs.cp("-r", "src/lib/.", path.join(pubDir, "src"));
fixSourcemaps({
    newDistRoot: path.resolve(pubDir),
    distGlob: "**/*.js",
    origDistRoot: path.resolve("dist/lib"),
    srcRoot: path.resolve("src/lib"),
    newSourceFile(old: string): string {
        let newSrcFile = path.relative(srcRoot, old);
        let newSrc = path.resolve(this.newDistRoot, "src", newSrcFile);
        return newSrc;
    }
});

shjs.exec("yarn publish", {
    cwd: ".tmp/publish"
});
