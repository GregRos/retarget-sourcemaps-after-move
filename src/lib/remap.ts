import _ = require("lodash");

require("source-map-support/register");
Error.stackTraceLimit = 100;
import shelljs = require("shelljs");
import * as esp from "esprima";
import globby = require("globby");
import SmUrl = require("source-map-url");
import {promisify} from "util";
import * as path from "path";
import * as fs from "fs";
import * as mzfs from "mz/fs"
import * as url from "url";
export interface Config {

    source: {
        root: string;

        sourcesRoot: string;

        mapsRoot: string;

        dist: string;

        distGlob: string;
    };

    target: {
        root: string;

        sourcesRoot: string;

        mapsRoot: string;
    }
}

function retargetPath(what: string, base1: string, base2: string) {
    let relToBase1 = path.relative(what, base1);
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
        return {src:js, sm:null};
    }
    let {range, value} = finalToken as any;
    let newJs = js.slice(range[0]) + js.slice(range[1]);
    return {src:newJs, sm: _.trim(value, "# \r\n\t").replace(/sourceMappingUrl=/ig, "")};
}


export async function run({source, target}: Config) {
    shelljs.mkdir("-p", target.root);
    source.
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

        distFileContent += `\n//# sourceMappingURL=${path.relative(rtDistDir, rtSmPath)}`;

        let smContent = await mzfs.readFile(origSmPath, {
            encoding: "utf8"
        });
        let smObject = JSON.parse(smContent);

        smObject.sources = smObject.sources.map(origRelSrc => {
            let origSrcFile = path.join(origDistDir, origRelSrc);
            let rtSrcFile = retargetPath(origSrcFile, source.sourcesRoot, target.sourcesRoot);
            let rtSrcDir = path.dirname(rtSrcFile);
            shelljs.mkdir("-p", path.dirname(rtSrcDir));
            shelljs.cp(origSrcFile, rtSrcFile);
            return path.relative(rtSmDir, rtSrcFile);
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
}

run({
    source: {
        sourcesRoot: "src/lib",
        dist: "dist/lib",
        distGlob: "**/*.js",
        mapsRoot: "dist/lib",
        root: process.cwd()
    },
    target: {
        sourcesRoot: "src",
        root: ".tmp/publish",
        mapsRoot: "."
    }

});