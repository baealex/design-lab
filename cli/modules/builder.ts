import * as fs from 'fs-extra';

import { useSocket } from './hooks/use-socket';
import { transpile } from './transpile';

const SOURCE_PATH = './src';
const PAGES_PATH = `${SOURCE_PATH}/pages`;
const DIST_PATH = './dist';

const INIT_OPTIONS = {
    isDev: false,
};

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
    await fs.copy('./src/public/', `${DIST_PATH}/`, {
        recursive: true,
    });
}

export async function makePage(path: string, { isDev } = INIT_OPTIONS) {
    const indexPath = `${PAGES_PATH}/${path}/index.html`;
    const indexFile = (await fs.readFile(indexPath)).toString();

    const newIndex = transpile(path, indexFile, {
        isDev,
        params: {
            pages: pages.filter(page => page !== 'index')
        },
    });
    
    if (isDev) {
        await fs.writeFile(`${DIST_PATH}/${path}.html`, useSocket(newIndex, `
            socket.on('onchange', function(path) {
                location.reload();
            });
        `));
        return;
    }
    await fs.writeFile(`${DIST_PATH}/${path}.html`, newIndex);
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