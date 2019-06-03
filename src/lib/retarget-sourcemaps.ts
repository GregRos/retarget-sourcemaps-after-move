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
    distGlob: string;
    distRoot: {
        old: string;
        new: string;
    };
    srcRoot: {
        old: string;
        new: string;
    };
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

function resolvePaths(obj: Record<string, string>) {
    _.forIn(obj, (v, k) => {
        obj[k] = path.resolve(v);
    });
}

export function retargetSourcemaps(cfg: Config) {
    cfg = _.cloneDeep(cfg);
    resolvePaths(cfg.distRoot);
    resolvePaths(cfg.srcRoot);
    let newDistFiles = globby.sync([cfg.distGlob, `!${cfg.srcRoot.new}`], {
        cwd: cfg.distRoot.new,
        absolute: true
    });

    for (let curDistFile of newDistFiles) {
        let curDistFileDir = path.dirname(curDistFile);

        let relDistPath = path.relative(cfg.distRoot.new, curDistFile);

        let origDistFile = path.join(cfg.distRoot.old, relDistPath);
        let origDistDir = path.dirname(origDistFile);

        let origDistContent = shjs.cat(origDistFile);

        let origSourceMapFileRel = extractSourceMappingComment(origDistContent).sm;
        let origSourceMapFile = path.join(origDistDir, origSourceMapFileRel)
        let origSourceMapContent = shjs.cat(origSourceMapFile);
        let origSourceMap = JSON.parse(origSourceMapContent.toString());

        origSourceMap.sources = origSourceMap.sources.map(origSourceFile => {
            let origSourcePath = path.join(origDistDir, origSourceFile);
            let origRelSourcePath = path.relative(cfg.srcRoot.old, origSourcePath);
            let newSourcePath = path.join(cfg.srcRoot.new, origRelSourcePath);
            let relNewSourceFile = path.relative(curDistFileDir, newSourcePath);
            return relNewSourceFile;
        });
        let newSourceMapContent = JSON.stringify(origSourceMap);
        let newDistContent = shjs.cat(curDistFile).toString();
        let out = extractSourceMappingComment(newDistContent);
        newDistContent = out.src;
        var newSourceMapFile = path.resolve(curDistFileDir, out.sm);
        newDistContent += `\n//# sourceMappingURL=${out.sm}`;
        shs(newDistContent).to(curDistFile);
        shs(newSourceMapContent).to(newSourceMapFile);
    }
}
