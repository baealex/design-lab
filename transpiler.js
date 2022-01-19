const ts = require('typescript');
const sass = require('node-sass');
const uglify = require('uglify-js');

const { tagSplit } = require('./text-parser');

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
 * @param {string} soruce 
 * @param {{ ignoreError: boolean, params: object }} options
 */
function transpile(source, {
    ignoreError,
    params,
}=INIT_OPTIONS) {
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
                compilerOptions:{
                    module: ts.ModuleKind.CommonJS
                }
            });
            const { code } = uglify.minify(transpile.outputText);
            newSource = newSource.replace(script, code);
        } catch(e) {
            if (!ignoreError) {
                throw e;
            }
            console.log(e);
        }
    }

    return newSource;
}

module.exports = {
    transpile
};