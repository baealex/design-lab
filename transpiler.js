const ts = require('typescript');
const sass = require('node-sass');
const uglify = require('uglify-js');

const { tagSplit } = require('./text-parser');

function transpile(source) {
    let newSource = source;

    const styles = tagSplit(source, '<style>', '</style>');
    for (const style of styles) {
        const { css } = sass.renderSync({
            data: style,
            outputStyle: 'compressed'
        });
        newSource = newSource.replace(style, css);
    }

    const scripts = tagSplit(source, '<script>', '</script>');
    for (const script of scripts) {
        const transpile = ts.transpileModule(script, {
            compilerOptions:{
                module: ts.ModuleKind.CommonJS
            }
        });
        const { code } = uglify.minify(transpile.outputText);
        newSource = newSource.replace(script, code);
    }

    return newSource;
}

module.exports = {
    transpile
};