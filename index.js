const fs = require('fs-extra');
const ts = require('typescript');
const sass = require('node-sass');
const uglify = require('uglify-js');

const { tagSplit } = require('./utility');

const TARGET_PATH = './src/pages';
const DIST_PATH = './dist';

(async () => {
    const paths = await fs.readdir(TARGET_PATH);
    if (await fs.exists(DIST_PATH)) {
        await fs.rmdir(DIST_PATH, {
            recursive: true,
            force: true,
        });
    }
    await fs.mkdir(DIST_PATH);
    await fs.copy(`./src/public/`, `${DIST_PATH}/`, {
        recursive: true,
    });

    for (const path of paths) {
        const indexPath = `${TARGET_PATH}/${path}/index.html`;
        const indexFile = (await fs.readFile(indexPath)).toString();

        let newIndex = indexFile;

        const styles = tagSplit(indexFile, '<style>', '</style>');
        for (const style of styles) {
            const { css } = sass.renderSync({
                data: style,
                outputStyle: 'compressed'
            });
            newIndex = newIndex.replace(style, css);
        }

        const scripts = tagSplit(indexFile, '<script>', '</script>');
        for (const script of scripts) {
            const transpile = ts.transpileModule(script, {
                compilerOptions:{
                    module: ts.ModuleKind.CommonJS
                }
            });
            const { code } = uglify.minify(transpile.outputText);
            newIndex = newIndex.replace(script, code);
        }

        await fs.mkdir(`${DIST_PATH}/${path}`);
        await fs.writeFile(`${DIST_PATH}/${path}/index.html`, newIndex);
    }
})()