const fs = require('fs-extra');

const { transpile } = require('./transpiler');

const TARGET_PATH = './src/pages';
const DIST_PATH = './dist';

async function getPages() {
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
    await makeIndex();
}

const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}

async function makeIndex() {
    const indexPath = `./src/public/index.html`;
    const indexFile = (await fs.readFile(indexPath)).toString();
    const newIndex = transpile(indexFile).replace('{{ pages }}', `
        <ul>
            ${(await getPages()).map((page, idx) => `
                <li>
                    <a href="/${page}">
                        ${idx + 1}. ${page.split('-').map(capitalize).join(' ')}
                    </a>
                </li>
            `.trim()).join('')}
        </ul>
    `.trim());
    await fs.writeFile(`${DIST_PATH}/index.html`, newIndex);
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
            compile(path, {
                ignoreError: true,
            });
        }
    });
}

module.exports = {
    compile,
    getPages,
    init,
    watch,
}