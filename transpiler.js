const crypto = require('crypto');

const fs = require('fs-extra');
const ts = require('typescript');
const sass = require('node-sass');
const uglify = require('uglify-js');

const { between, tagSplit } = require('./text-parser');

const INIT_OPTIONS = {
    ignoreError: false,
    params: undefined,
}

/**
 * @param {string} soruce 
 * @param {object} params 
 */
function injectParams(source, params) {
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

/**
 * @param {string} pageName 
 * @param {string} soruce 
 * @param {{ ignoreError: boolean, params: object }} options
 */
function transpile(pageName, source, {
    ignoreError,
    params,
}=INIT_OPTIONS) {
    const template = between(source, `{% extends '`, `' %}`);
    if (template) {
        return transpileWithTemplate(pageName, source, {
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
            newSource = newSource.replace(style, css);
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
                    target: 'ES5',
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

/**
 * @param {string} pageName 
 * @param {string} soruce 
 * @param {{ ignoreError: boolean, params: object }} options
 */
 function transpileWithTemplate(pageName, source, {
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
            const md5Hasher = crypto.createHmac('md5', pageName + keyword);

            if (keyword === 'title') {
                mergeItems.push(`<title>${item}</title>`);
            }

            else if (keyword === 'script') {
                try {
                    const newScript = injectParams(item, params);
                    const transpile = ts.transpileModule(newScript, {
                        compilerOptions: {
                            target: 'ES5',
                            module: ts.ModuleKind.CommonJS
                        }
                    });
                    const { code } = uglify.minify(transpile.outputText);
                    const hash = md5Hasher.update(code).digest('hex');
                    const fileName = `${pageName}.${hash}.js`;
                    const filePath = `./dist/assets/scripts/${fileName}`;
                    fs.writeFile(filePath, `(function(){${code}})();`);
                    mergeItems.push(`<script src="/assets/scripts/${fileName}"></script>`);
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
                    const hash = md5Hasher.update(css).digest('hex');
                    const fileName = `${pageName}.${hash}.css`;
                    const filePath = `./dist/assets/styles/${fileName}`;
                    fs.writeFile(filePath, css);
                    mergeItems.push(`<link href="/assets/styles/${fileName}" rel="stylesheet"/>`)
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