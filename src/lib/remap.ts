import _ = require("lodash");
import shelljs = require("shelljs");
import globby = require("globby");

require("source-map-support/register");
Error.stackTraceLimit = 100;

import * as esp from "esprima";
import * as path from "path";
import * as mzfs from "mz/fs"

export interface Config {

    source: {
        root: string;

        sourcesRoot: string;

        mapsRoot: string;

        dist: string;

        distGlob: string | string[];

        contentGlob: string | string[];
    };

    target: {
        root: string;

        sources: string;

        maps: string;
    }
}

function retargetPath(what: string, base1: string, base2: string) {
    let relToBase1 = path.relative(base1, what);
    let relToBase2 = path.join(base2, relToBase1);
    return relToBase2;
}

function extractSourceMappingComment(js: string) {
    let tokens = esp.tokenize(js, {
        comment: true,
        range: true
    });
    let finalToken = tokens[tokens.length - 1];
    if (!finalToken || !finalToken.type.includes("Comment")) {
        return {src: js, sm: null};
    }
    let {range, value} = finalToken as any;
    let newJs = js.slice(0, range[0]) + js.slice(range[1], -1);
    return {src: newJs, sm: _.trim(value, "# \r\n\t").replace(/sourceMappingUrl=/ig, "")};
}

function enforcePosix(pt: string) {
    return pt.replace(/\\/g, "/");
}


export async function run(config: Config) {
    let {source, target} = _.clone(config);
    source.root = path.resolve(source.root);
    source.dist = path.resolve(source.root, source.dist);
    source.mapsRoot = path.resolve(source.root, source.mapsRoot);
    source.sourcesRoot = path.resolve(source.root, source.sourcesRoot);

    target.root = path.resolve(target.root);
    target.sources = path.resolve(target.root, target.sources);
    target.maps = path.resolve(target.root, target.maps);
    shelljs.rm("-rf", target.root);
    shelljs.mkdir("-p", target.root);
    let dist = await globby(source.distGlob, {
        cwd: source.dist,
        absolute: true
    });

    for (let origDistFile of dist) {
        let origDistDir = path.dirname(origDistFile);

        // Full path to the relocated dist file:
        let rtDistFile = retargetPath(origDistFile, source.dist, target.root);

        // Just the dir part:
        let rtDistDir = path.dirname(rtDistFile);
        let distFileContent = await mzfs.readFile(origDistFile, {
            encoding: "utf8"
        });
        let obj = extractSourceMappingComment(distFileContent);
        if (!obj.sm) throw new Error("!!!");
        distFileContent = obj.src;
        let origRelSmPath = obj.sm;
        let origSmPath = path.resolve(path.dirname(origDistFile), origRelSmPath);

        // Full path to the retargeted source file:
        let rtSmPath = retargetPath(origSmPath, origDistDir, rtDistDir);
        let rtSmDir = path.dirname(rtSmPath);

        distFileContent += `\n//# sourceMappingURL=${enforcePosix(path.relative(rtDistDir, rtSmPath))}`;

        let smContent = await mzfs.readFile(origSmPath, {
            encoding: "utf8"
        });
        let smObject = JSON.parse(smContent);

        smObject.sources = smObject.sources.map(origRelSrc => {
            let origSrcFile = path.join(origDistDir, origRelSrc);
            let rtSrcFile = retargetPath(origSrcFile, source.sourcesRoot, target.sources);
            let rtSrcDir = path.dirname(rtSrcFile);
            shelljs.mkdir("-p", rtSrcDir);
            shelljs.cp(origSrcFile, rtSrcFile);
            return enforcePosix(path.relative(rtSmDir, rtSrcFile));
        });

        smContent = JSON.stringify(smObject);
        shelljs.mkdir("-p", rtDistDir);
        shelljs.mkdir("-p", rtSmDir);
        await mzfs.writeFile(rtSmPath, smContent, {
            encoding: "utf8"
        });

        await mzfs.writeFile(rtDistFile, distFileContent, {
            encoding: "utf8"
        })
    }

    for (let origContentFile of await globby(source.contentGlob, {
        absolute: true,
        cwd: source.root
    })) {
        let rtContentFile = retargetPath(origContentFile, source.root, target.root);
        shelljs.cp(origContentFile)
    }
}

run({
    source: {
        sourcesRoot: "src/lib",
        dist: "dist/lib",
        distGlob: "**/*.js",
        mapsRoot: "dist/lib",
        root: path.resolve("../objectology")
    },
    target: {
        sources: "src",
        root: ".tmp/publish-objy",
        maps: "."
    }

});
