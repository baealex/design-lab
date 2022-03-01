import * as fs from 'fs-extra';

const {
    transpile,
} = require('./transpiler');

const SOURCE_PATH = './src'
const INDEX_PATH = `${SOURCE_PATH}/public/index.html`;
const PAGES_PATH = `${SOURCE_PATH}/pages`;
const DIST_PATH = './dist';

const INIT_OPTIONS = {
    isDev: false,
}

export const pages = fs.readdirSync(PAGES_PATH);

export async function distDirInit() {
    if (fs.existsSync(DIST_PATH)) {
        await fs.rm(DIST_PATH, {
            recursive: true,
            force: true,
        });
    }
    await fs.mkdir(DIST_PATH);
    await fs.mkdir(DIST_PATH + '/assets');
    await fs.mkdir(DIST_PATH + '/assets' + '/styles');
    await fs.mkdir(DIST_PATH + '/assets' + '/scripts');
    await fs.copy(`./src/public/`, `${DIST_PATH}/`, {
        recursive: true,
    });
}

/**
 * @param {{ isDev?: boolean }} options 
 */
export async function makeIndex({ isDev } = INIT_OPTIONS) {
    const indexFile = (await fs.readFile(INDEX_PATH)).toString();
    const newIndex = transpile('index', indexFile, {
        isDev,
        ignoreError: isDev,
        params: { pages }
    });
    if (isDev) {
        await fs.writeFile(`${DIST_PATH}/index.html`, newIndex.replace('</body>', `
            <script src="/socket.io/socket.io.js"></script>
            <script>
                var socket = io();
                socket.on('onchange', function() {
                    location.reload();
                });
            </script>
            </body>
        `));
        return;
    }
    await fs.writeFile(`${DIST_PATH}/index.html`, newIndex);
}

export async function watchIndex() {
    fs.watch(INDEX_PATH, async (eventType) => {
        if (eventType === 'change') {
            const time = new Date();
            await makeIndex({ isDev: true });
            console.log(`Rebuild... index.html : ${(new Date().getTime() - time.getTime()) / 1000}s`);
        }
    });
}

/**
 * @param {string} path 
 * @param {{ isDev?: boolean }} options 
 */
export async function makePage(path: string, { isDev } = INIT_OPTIONS) {
    const indexPath = `${PAGES_PATH}/${path}/index.html`;
    const indexFile = (await fs.readFile(indexPath)).toString();

    const newIndex = transpile(path, indexFile, {
        isDev,
        ignoreError: isDev,
    });
    
    if (!fs.existsSync(`${DIST_PATH}/${path}`)) {
        await fs.mkdir(`${DIST_PATH}/${path}`);
    }
    if (isDev) {
        await fs.writeFile(`${DIST_PATH}/${path}/index.html`, newIndex.replace('</body>', `
            <script src="/socket.io/socket.io.js"></script>
            <script>
                var socket = io();
                socket.on('onchange', function() {
                    location.reload();
                });
            </script>
            </body>
        `));
        return;
    }
    await fs.writeFile(`${DIST_PATH}/${path}/index.html`, newIndex);
}

/**
 * @param {string} path
 */
export async function watchPage(path: string, onChange: (path: string) => void) {
    const indexPath = `${PAGES_PATH}/${path}/index.html`;
    fs.watch(indexPath, async (eventType) => {
        if (eventType === 'change') {
            const time = new Date();
            await makePage(path, { isDev: true });
            console.log(`Rebuild... ${path} : ${(new Date().getTime() - time.getTime()) / 1000}s`);
            if (onChange) {
                onChange(path);
            }
        }
    });
}