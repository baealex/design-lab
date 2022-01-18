const ts = require('typescript');
const sass = require('node-sass');
const uglify = require('uglify-js');

const { tagSplit } = require('./text-parser');

function transpile(source, options) {
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
            if (options && !options.ignoreError) {
                throw e;
            }
            console.log(e);
        }
    }

    const scripts = tagSplit(source, '<script>', '</script>');
    for (const script of scripts) {
        try {
            const transpile = ts.transpileModule(script, {
                compilerOptions:{
                    module: ts.ModuleKind.CommonJS
                }
            });
            const { code } = uglify.minify(transpile.outputText);
            newSource = newSource.replace(script, code);
        } catch(e) {
            if (options && !options.ignoreError) {
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