const fs = require('fs-extra');

const { transpile } = require('./transpiler');

const TARGET_PATH = './src/pages';
const DIST_PATH = './dist';

async function getPaths() {
    return await fs.readdir(TARGET_PATH);
}

async function init() {
    if (fs.existsSync(DIST_PATH)) {
        await fs.rmdir(DIST_PATH, {
            recursive: true,
            force: true,
        });
    }
    await fs.mkdir(DIST_PATH);
    await fs.copy(`./src/public/`, `${DIST_PATH}/`, {
        recursive: true,
    });
}

async function compile(path) {
    const indexPath = `${TARGET_PATH}/${path}/index.html`;
    const indexFile = (await fs.readFile(indexPath)).toString();
    const newIndex = transpile(indexFile);
    if (!fs.existsSync(`${DIST_PATH}/${path}`)) {
        await fs.mkdir(`${DIST_PATH}/${path}`);
    }
    await fs.writeFile(`${DIST_PATH}/${path}/index.html`, newIndex);
}

async function watch(path) {
    const indexPath = `${TARGET_PATH}/${path}/index.html`;
    fs.watch(indexPath, (eventType) => {
        if (eventType === 'change') {
            console.log(`rebuild... ${indexPath}`);
            compile(path);
        }
    });
}

module.exports = {
    compile,
    getPaths,
    init,
    watch,
}