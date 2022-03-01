import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as ts from 'typescript';
import * as sass from 'node-sass';
import * as uglify from 'uglify-js';

import {
    between,
    tagSplit,
} from './text-parser';

const INIT_OPTIONS = {
    isDev: false,
    ignoreError: false,
    params: undefined,
}

function injectParams(source: string, params: any) {
    let newSource = source;
    if (params && typeof params === 'object') {
        Object.keys(params).forEach(key => {
            newSource = newSource.replace(
                `{{ ${key} }}`,
                JSON.stringify(params[key]),
            );
        })
    }
    return newSource;
}

function transpile(pageName: string, source: string, {
    isDev,
    ignoreError,
    params,
}=INIT_OPTIONS) {
    const template = between(source, `{% extends '`, `' %}`);
    if (template) {
        return transpileWithTemplate(pageName, source, {
            isDev,
            ignoreError,
            params,
        });
    }

    let newSource = source;

    const styles = tagSplit(source, '<style>', '</style>');
    for (const style of styles) {
        try {
            const { css } = sass.renderSync({
                data: style,
                outputStyle: 'compressed'
            });
            newSource = newSource.replace(style, css.toString());
        } catch(e) {
            if (!ignoreError) {
                throw e;
            }
            console.log(e);
        }
    }

    const scripts = tagSplit(source, '<script>', '</script>');
    for (const script of scripts) {
        try {
            const newScript = injectParams(script, params);
            const transpile = ts.transpileModule(newScript, {
                compilerOptions: {
                    target: ts.ScriptTarget.ES5,
                    module: ts.ModuleKind.CommonJS
                }
            });
            const { code } = uglify.minify(transpile.outputText);
            newSource = newSource.replace(script, `(function(){${code}})();`);
        } catch(e) {
            if (!ignoreError) {
                throw e;
            }
            console.log(e);
        }
    }

    return newSource;
}

function transpileWithTemplate(pageName: string, source: string, {
    isDev,
    ignoreError,
    params,
}=INIT_OPTIONS) {
    const template = between(source, `{% extends '`, `' %}`);
    const templateSource = fs.readFileSync(`./src/templates/${template}`).toString();
    let newSource = templateSource;
    
    const keywords = tagSplit(templateSource, '{{ ', ' }}');
    for (const keyword of keywords) {
        const items = tagSplit(source, `<${keyword}>`, `</${keyword}>`);
        const mergeItems = [];

        for (const item of items) {
            const md5Maker = crypto.createHmac('md5', pageName + keyword);

            if (keyword === 'title') {
                mergeItems.push(`<title>${item}</title>`);
            }

            else if (keyword === 'script') {
                try {
                    const newScript = injectParams(item, params);
                    const transpile = ts.transpileModule(newScript, {
                        compilerOptions: {
                            target: ts.ScriptTarget.ES5,
                            module: ts.ModuleKind.CommonJS
                        }
                    });
                    const { code } = uglify.minify(transpile.outputText);
                    if (!isDev) {
                        const hash = md5Maker.update(code).digest('hex');
                        const fileName = `${pageName}.${hash}.js`;
                        const filePath = `./dist/assets/scripts/${fileName}`;
                        fs.writeFile(filePath, `(function(){${code}})();`);
                        mergeItems.push(`<script src="/assets/scripts/${fileName}"></script>`);
                    } else {
                        mergeItems.push(`<script>(function(){${code}})();</script>`);
                    }
                } catch(e) {
                    if (!ignoreError) {
                        throw e;
                    }
                    console.log(e);
                }   
            }

            else if (keyword === 'style') {
                try {
                    const { css } = sass.renderSync({
                        data: item,
                        outputStyle: 'compressed'
                    });
                    if (!isDev) {
                        const hash = md5Maker.update(css).digest('hex');
                        const fileName = `${pageName}.${hash}.css`;
                        const filePath = `./dist/assets/styles/${fileName}`;
                        fs.writeFile(filePath, css);
                        mergeItems.push(`<link href="/assets/styles/${fileName}" rel="stylesheet"/>`)
                    } else {
                        mergeItems.push(`<style>${css}</style>`)
                    }
                } catch(e) {
                    if (!ignoreError) {
                        throw e;
                    }
                    console.log(e);
                }
            }

            else {
                mergeItems.push(item);
            }
        }
        newSource = newSource.replace(`{{ ${keyword} }}`, mergeItems.join(''))
    }

    return newSource;
}

module.exports = {
    transpile,
};