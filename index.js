const fs = require('fs');
const ts = require('typescript');
const sass = require('node-sass');
const uglify = require('uglify-js');

const TARGET_PATH = './src/pages';
const DIST_PATH = './dist';

function between(str, left, right, idx=0 ) {
    const regex = new RegExp("(?:"+left.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')+")((.|[\r\n])*?)(?:"+right.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')+")", 'g');
    const res = String(str).match(regex);

    if( Number.isInteger(idx) == false) {
        idx = 0;
    }

    if(res?.length > idx) {
        if (idx == -1){
            const r = res[res.length-1];
            return r.substring(left.length, r.length-right.length);
        }
        const r = res[idx];
        return r.substring(left.length, r.length-right.length);
    }
    return '';
}

function tagSplit(str, openTag, closeTag){
    const lists = str.split(openTag);
    const contents = [];
    for (let i = 1; i<lists.length; i++) {
        lists[i] = openTag + lists[i];
        const tagContent = between(lists[i], openTag, closeTag);
        contents[i-1] = tagContent;
    }
    return contents;
}

const paths = fs.readdirSync(TARGET_PATH);
fs.rmSync(DIST_PATH, {
    recursive: true,
    force: true,
});
fs.mkdirSync(DIST_PATH);
fs.cpSync(`./src/public/`, `${DIST_PATH}/`, {
    recursive: true,
});

for (const path of paths) {
    const indexPath = `${TARGET_PATH}/${path}/index.html`;
    const indexFile = fs.readFileSync(indexPath).toString();

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

    fs.mkdirSync(`${DIST_PATH}/${path}`);
    fs.writeFileSync(`${DIST_PATH}/${path}/index.html`, newIndex);
}