import * as fs from 'fs-extra';
import * as path from 'path';

import { useSocketClient } from './hooks';
import { transpile } from './transpile';

export const SOURCE_PATH = './src';
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
        await fs.writeFile(`${DIST_PATH}/${path}.html`, useSocketClient(newIndex, `
            socket.on('onchange', function(path) {
                if (path === 'index') {
                    path = '/';
                }
                if (location.pathname.indexOf(path) > -1) {
                    location.reload();
                }
            });
        `));
        return;
    }
    await fs.writeFile(`${DIST_PATH}/${path}.html`, newIndex);
}

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

interface WalkHandler {
    filePath: string;
    isDirectory: boolean;
}

function walk(dir: string, handler: ({
    filePath,
    isDirectory,
}: WalkHandler) => void) {
    fs.readdir(dir, (err, filenames) => {
        filenames.forEach((filename) => {
            fs.stat(path.join(dir, filename), (err, stat) => {
                if (stat.isDirectory()) {
                    walk(path.join(dir, filename), handler);
                }
                handler({
                    filePath: path.join(dir, filename),
                    isDirectory: stat.isDirectory()
                });
            });
        });
    });
}

export async function watchSrc(path: string, onChange: (path: string) => void) {
    const watchingFiles: string[] = [];

    const handler = ({
        filePath,
        isDirectory,
    }: WalkHandler) => {
        if (watchingFiles.includes(filePath)) {
            return;
        }
        watchingFiles.push(filePath);
        if (isDirectory) {
            fs.watch(filePath, async () => {
                walk(filePath, handler);
                handler({
                    filePath,
                    isDirectory,
                });
            });
            return;
        }
        if (filePath.includes('pages') && filePath.indexOf('.html') > -1) {
            filePath = filePath.split('/').slice(2, -1).join('/');
            watchPage(filePath, onChange);
        }
        if (filePath.includes('public') && !isDirectory) {
            fs.copy(filePath, `${DIST_PATH}/${filePath.split('/').slice(2).join('/')}`);
        }
    };

    walk(path, handler);
}