import * as path from "path";
import {retargetSourcemaps} from "./lib";
import shjs = require("shelljs")
let srcRoot = path.resolve("src/lib");

let pubDir = ".publish";

shjs.rm("-rf", pubDir);
shjs.mkdir("-p", pubDir);
shjs.cp("-r", [
    "package.json",
    "LICENSE.md",
    "README.md"
], pubDir);

shjs.cp("-r", "dist/lib/.", pubDir);
shjs.cp("-r", "src/lib/.", path.join(pubDir, "src"));
retargetSourcemaps({
    distRoot: {
        new: path.resolve(pubDir),
        old: "dist/lib"
    },
    srcRoot: {
        old: srcRoot,
        new: path.join(pubDir, "src")
    },
    distGlob: "**/*.js",
});
