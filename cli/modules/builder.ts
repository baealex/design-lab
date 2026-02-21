import * as fs from 'fs-extra';
import * as path from 'path';
import { watch } from 'chokidar';

import { useSocketClient } from './hooks';
import { buildPage } from './pipeline';
import { parsePage } from './pipeline/parse-page';

export const SOURCE_PATH = './src';
const PAGES_PATH = `${SOURCE_PATH}/pages`;
const TEMPLATES_PATH = `${SOURCE_PATH}/templates`;
const DIST_PATH = './dist';

const INIT_OPTIONS = {
    isDev: false,
};

function scanPages(): string[] {
    return fs.readdirSync(PAGES_PATH).filter(page => {
        return fs.existsSync(`${PAGES_PATH}/${page}/index.html`);
    });
}

export let pages = scanPages();

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
    await fs.copy('./src/public/', `${DIST_PATH}/`);
}

export async function makePage(pagePath: string, { isDev } = INIT_OPTIONS) {
    const indexPath = `${PAGES_PATH}/${pagePath}/index.html`;

    if (!fs.existsSync(indexPath)) {
        console.warn(`Skipped: ${indexPath} not found`);
        return;
    }

    const indexFile = (await fs.readFile(indexPath)).toString();

    const pagesData = pagePath === 'index'
        ? pages
            .filter(page => page !== 'index' && page !== '404')
            .reduce<{ name: string; title: string; description: string; year: number | null; category: string }[]>((acc, page) => {
                try {
                    const pageSource = fs.readFileSync(`${PAGES_PATH}/${page}/index.html`).toString();
                    const { metadata } = parsePage(pageSource);
                    acc.push({
                        name: page,
                        title: metadata.title,
                        description: metadata.description,
                        year: page.match(/^(?:design|concept)-(\d{4})/)?.[1] ? parseInt(page.match(/^(?:design|concept)-(\d{4})/)![1], 10) : null,
                        category: page.split('-')[0] || '',
                    });
                } catch {
                    console.warn(`Skipped: ${page}/index.html not found`);
                }
                return acc;
            }, [])
        : [];

    const newIndex = await buildPage(pagePath, indexFile, {
        isDev,
        data: {
            pages: pagesData,
        },
    });

    if (isDev) {
        await fs.writeFile(`${DIST_PATH}/${pagePath}.html`, useSocketClient(newIndex, `
            socket.on('onchange', function(path) {
                if (path === 'index') {
                    path = '/';
                }
                if (location.pathname.indexOf(path) > -1) {
                    location.reload();
                }
            });
            socket.on('onerror', function(message) {
                if (message) {
                    window.__showErrorOverlay(message);
                } else {
                    window.__hideErrorOverlay();
                }
            });
        `));
        return;
    }
    await fs.writeFile(`${DIST_PATH}/${pagePath}.html`, newIndex);
}

export function watchSrc(onChange: (pagePath: string) => void) {
    const watcher = watch([PAGES_PATH, TEMPLATES_PATH, `${SOURCE_PATH}/public`], {
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50,
        },
    });

    watcher.on('all', async (event, filePath) => {
        if (event !== 'change' && event !== 'add' && event !== 'unlink') return;

        const time = new Date();
        const relativePath = path.relative(SOURCE_PATH, filePath);

        if (relativePath.startsWith('templates/')) {
            console.log(`Template changed: ${relativePath}, rebuilding all pages...`);
            await Promise.all(
                pages.map(page => makePage(page, { isDev: true }))
            );
            console.log(`Rebuild all... : ${(new Date().getTime() - time.getTime()) / 1000}s`);
            onChange('index');
            return;
        }

        if (relativePath.startsWith('public/')) {
            const destPath = `${DIST_PATH}/${path.relative(`${SOURCE_PATH}/public`, filePath)}`;
            await fs.copy(filePath, destPath);
            console.log(`Copied: ${relativePath}`);
            return;
        }

        if (relativePath.startsWith('pages/')) {
            const parts = relativePath.split(path.sep);
            const pageName = parts[1];
            if (!pageName) return;

            const isIndexHtml = parts[2] === 'index.html';
            const isNewOrRemoved = isIndexHtml && (event === 'add' || event === 'unlink');

            if (isNewOrRemoved) {
                const prevPages = pages;
                pages = scanPages();
                const added = pages.filter(p => !prevPages.includes(p));
                const removed = prevPages.filter(p => !pages.includes(p));

                if (added.length > 0 || removed.length > 0) {
                    console.log(`Pages updated: +[${added.join(', ')}] -[${removed.join(', ')}]`);
                    await Promise.all(
                        pages.map(page => makePage(page, { isDev: true }))
                    );
                    console.log(`Rebuild all... : ${(new Date().getTime() - time.getTime()) / 1000}s`);
                    onChange('index');
                    return;
                }
            }

            if (pages.includes(pageName)) {
                await makePage(pageName, { isDev: true });
                if (pageName !== 'index') {
                    await makePage('index', { isDev: true });
                }
                console.log(`Rebuild... ${pageName} : ${(new Date().getTime() - time.getTime()) / 1000}s`);
                onChange(pageName);
                if (pageName !== 'index') {
                    onChange('index');
                }
            }
        }
    });

    return watcher;
}
