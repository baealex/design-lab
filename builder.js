const fs = require('fs-extra');

const { transpile } = require('./transpiler');

const SOURCE_PATH = './src'
const INDEX_PATH = `${SOURCE_PATH}/public/index.html`;
const PAGES_PATH = `${SOURCE_PATH}/pages`;
const DIST_PATH = './dist';

const pages = fs.readdirSync(PAGES_PATH);

async function distDirInit() {
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

/**
 * @param {{ ignoreError?: boolean }} options 
 */
async function makeIndex(options) {
    const indexFile = (await fs.readFile(INDEX_PATH)).toString();
    const newIndex = transpile(indexFile, {
        ...options,
        params: { pages }
    });
    await fs.writeFile(`${DIST_PATH}/index.html`, newIndex);
}

async function watchIndex() {
    fs.watch(INDEX_PATH, (eventType) => {
        if (eventType === 'change') {
            const time = new Date();
            makeIndex({ ignoreError: true });
            console.log(`Rebuild... index.html : ${new Date() - time}`);
        }
    });
}

/**
 * @param {{ ignoreError?: boolean }} options 
 */
async function makePages(options) {
    for (const path of pages) {
        await makePage(path, options);
    }
}

async function watchPages() {
    for (const path of pages) {
        await watchPage(path);
    }
}

/**
 * @param {string} path 
 * @param {{ ignoreError?: boolean }} options 
 */
async function makePage(path, options) {
    const indexPath = `${PAGES_PATH}/${path}/index.html`;
    const indexFile = (await fs.readFile(indexPath)).toString();
    const newIndex = transpile(indexFile, options);
    if (!fs.existsSync(`${DIST_PATH}/${path}`)) {
        await fs.mkdir(`${DIST_PATH}/${path}`);
    }
    await fs.writeFile(`${DIST_PATH}/${path}/index.html`, newIndex);
}

/**
 * @param {string} path
 */
async function watchPage(path) {
    const indexPath = `${PAGES_PATH}/${path}/index.html`;
    fs.watch(indexPath, (eventType) => {
        if (eventType === 'change') {
            const time = new Date();
            makePage(path, { ignoreError: true });
            console.log(`Rebuild... ${path} : ${new Date() - time}`);
        }
    });
}

module.exports = {
    distDirInit,
    makeIndex,
    watchIndex,
    makePages,
    watchPages,
}