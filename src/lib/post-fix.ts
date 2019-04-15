import "source-map-support/register";
import globby = require("globby");
import * as path from "path";
import shjs = require("shelljs")
import * as esp from "esprima";
import _ = require("lodash");
import {ShellString} from "shelljs";

function shs(str: string): ShellString {
    return new (shjs as any).ShellString(str)
}

export interface Config {
    newDistRoot: string;
    distGlob: string | string[];
    origDistRoot: string;
    srcRoot: string;
    newSourceFile(old: string): string;
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

export function fixSourcemaps(cfg: Config) {

    let newDistFiles = globby.sync(cfg.distGlob, {
        cwd: cfg.newDistRoot,
        absolute: true
    });

    for (let curDistFile of newDistFiles) {
        let curDistFileDir = path.dirname(curDistFile);

        let relDistPath = path.relative(cfg.newDistRoot, curDistFile);

        let origDistFile = path.join(cfg.origDistRoot, relDistPath);
        let origDistDir = path.dirname(origDistFile);

        let origDistContent = shjs.cat(origDistFile);

        let origSourceMapFileRel = extractSourceMappingComment(origDistContent).sm;
        let origSourceMapFile = path.join(origDistDir, origSourceMapFileRel)
        let origSourceMapContent = shjs.cat(origSourceMapFile);
        let origSourceMap = JSON.parse(origSourceMapContent.toString());

        origSourceMap.sources = origSourceMap.sources.map(origSourceFile => {
            let newSourceFile = cfg.newSourceFile(path.join(origDistDir, origSourceFile));
            let relNewSourceFile = path.relative(curDistFileDir, newSourceFile);
            return relNewSourceFile;
        });
        let newSourceMapContent = JSON.stringify(origSourceMap);
        let newDistContent = shjs.cat(curDistFile).toString();
        let out = extractSourceMappingComment(newDistContent);
        newDistContent = out.src;
        var newSourceMapFile = path.resolve(curDistFileDir, out.sm);
        newDistContent += `\n//# sourceMappingURL=${out.sm}`;
        shs(newDistContent).to(curDistFile)
        shs(newSourceMapContent).to(newSourceMapFile)
    }
}
