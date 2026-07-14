import * as fs from 'fs-extra';
import * as path from 'path';

import {
    compilePage,
    DependencyGraph,
    type GlobalAssets,
    parsePage,
    type PageDefinition,
    type PreparedFile,
    prepareGlobalAssets,
    type PreparedGlobalAssets,
    writePreparedFiles,
} from './index';

export const SOURCE_PATH = path.resolve('src');
export const PAGES_PATH = path.join(SOURCE_PATH, 'pages');
export const LAYOUTS_PATH = path.join(SOURCE_PATH, 'layouts');
export const PARTIALS_PATH = path.join(SOURCE_PATH, 'partials');
export const GLOBAL_PATH = path.join(SOURCE_PATH, 'global');
export const PUBLIC_PATH = path.join(SOURCE_PATH, 'public');
export const DIST_PATH = path.resolve('dist');

export interface PageData {
    name: string;
    title: string;
    description: string;
    year: number | null;
    category: string;
}

export interface PreparedPageBuild {
    page: string;
    file: string;
    definition: PageDefinition;
    dependencies: string[];
    files: PreparedFile[];
}

export interface BuildTransaction {
    global?: PreparedGlobalAssets;
    pages?: PreparedPageBuild[];
    removedPages?: string[];
}

export interface PageChange {
    kind: 'none' | 'style' | 'page';
    metadataChanged: boolean;
}

const dependencyGraph = new DependencyGraph();
const pageDefinitions = new Map<string, PageDefinition>();
let pages = scanPages();
let globalAssets: GlobalAssets = { style: '', script: '' };

function scanPages(): string[] {
    if (!fs.existsSync(PAGES_PATH)) return [];
    return fs.readdirSync(PAGES_PATH)
        .filter(page => fs.existsSync(path.join(PAGES_PATH, page, 'index.html')))
        .sort();
}

function pageFile(page: string): string {
    return path.join(PAGES_PATH, page, 'index.html');
}

function sameMetadata(left: PageDefinition, right: PageDefinition): boolean {
    return left.metadata.layout === right.metadata.layout
        && left.metadata.title === right.metadata.title
        && left.metadata.description === right.metadata.description;
}

export function getPages(): string[] {
    return [...pages];
}

export function getPagesData(): PageData[] {
    return pages
        .filter(page => page !== 'index' && page !== '404')
        .map(page => {
            const file = pageFile(page);
            const source = fs.readFileSync(file, 'utf8');
            const { metadata } = parsePage(source, file);
            const yearValue = page.match(/^(?:design|concept)-(\d{4})/)?.[1];
            return {
                name: page,
                title: metadata.title,
                description: metadata.description,
                year: yearValue ? parseInt(yearValue, 10) : null,
                category: page.split('-')[0] || '',
            };
        });
}

export function refreshPages(): { added: string[]; removed: string[] } {
    const previous = pages;
    const next = scanPages();
    pages = next;
    return {
        added: next.filter(page => !previous.includes(page)),
        removed: previous.filter(page => !next.includes(page)),
    };
}

export function classifyPageChange(page: string): PageChange {
    const file = pageFile(page);
    const current = parsePage(fs.readFileSync(file, 'utf8'), file);
    const previous = pageDefinitions.get(page);
    if (!previous) return { kind: 'page', metadataChanged: true };

    const metadataChanged = !sameMetadata(previous, current);
    const unchanged = !metadataChanged
        && previous.style === current.style
        && previous.body === current.body
        && previous.script === current.script;
    if (unchanged) return { kind: 'none', metadataChanged: false };

    const styleOnly = !metadataChanged
        && previous.style !== current.style
        && previous.body === current.body
        && previous.script === current.script;

    return {
        kind: styleOnly ? 'style' : 'page',
        metadataChanged,
    };
}

export async function preparePage(
    page: string,
    options: { isDev: boolean; global?: GlobalAssets },
): Promise<PreparedPageBuild> {
    const file = pageFile(page);
    if (!fs.existsSync(file)) throw new Error(`Page not found: ${file}`);

    const source = await fs.readFile(file, 'utf8');
    const compiled = await compilePage(page, source, {
        isDev: options.isDev,
        globalAssets: options.global ?? globalAssets,
        data: page === 'index' ? { pages: getPagesData() } : undefined,
        file,
    });

    return {
        page,
        file,
        definition: compiled.definition,
        dependencies: [file, ...compiled.dependencies],
        files: [
            ...compiled.files,
            { path: `${page}.html`, contents: compiled.html },
        ],
    };
}

export async function preparePages(
    pageNames: Iterable<string>,
    options: { isDev: boolean; global?: GlobalAssets },
): Promise<PreparedPageBuild[]> {
    return Promise.all(Array.from(new Set(pageNames)).map(page => preparePage(page, options)));
}

export async function commitBuild(transaction: BuildTransaction) {
    const preparedPages = transaction.pages ?? [];
    const files = [
        ...(transaction.global?.files ?? []),
        ...preparedPages.flatMap(page => page.files),
    ];

    await writePreparedFiles(files, DIST_PATH);

    for (const removed of transaction.removedPages ?? []) {
        await Promise.all([
            fs.remove(path.join(DIST_PATH, `${removed}.html`)),
            fs.remove(path.join(DIST_PATH, 'assets/styles', `${removed}.css`)),
            fs.remove(path.join(DIST_PATH, 'assets/scripts', `${removed}.js`)),
        ]);
        dependencyGraph.removePage(removed);
        pageDefinitions.delete(removed);
    }

    if (transaction.global) globalAssets = transaction.global.assets;
    preparedPages.forEach(prepared => {
        dependencyGraph.updatePage(prepared.page, prepared.dependencies);
        pageDefinitions.set(prepared.page, prepared.definition);
    });
}

async function initializeDist() {
    await fs.remove(DIST_PATH);
    await fs.ensureDir(path.join(DIST_PATH, 'assets/styles'));
    await fs.ensureDir(path.join(DIST_PATH, 'assets/scripts'));
    await fs.copy(PUBLIC_PATH, DIST_PATH);
}

export async function buildAll({ isDev = false } = {}) {
    pages = scanPages();
    const preparedGlobal = await prepareGlobalAssets({ isDev });
    const preparedPages = await preparePages(pages, {
        isDev,
        global: preparedGlobal.assets,
    });

    await initializeDist();
    dependencyGraph.clear();
    pageDefinitions.clear();
    await commitBuild({ global: preparedGlobal, pages: preparedPages });

    return {
        pages: preparedPages.map(prepared => prepared.page),
        files: preparedPages.flatMap(prepared => prepared.files),
    };
}

export function getAffectedPages(file: string): string[] {
    return dependencyGraph.getAffectedPages(file);
}

export function getPagesUsingLayout(file: string): string[] {
    const layoutName = path.basename(file);
    return pages.filter(page => pageDefinitions.get(page)?.metadata.layout === layoutName);
}

export function getGlobalAssets(): GlobalAssets {
    return globalAssets;
}

export async function copyPublicChange(event: 'add' | 'change' | 'unlink', file: string) {
    const relative = path.relative(PUBLIC_PATH, path.resolve(file));
    if (relative.startsWith('..') || path.isAbsolute(relative)) return;
    const destination = path.join(DIST_PATH, relative);
    if (event === 'unlink') {
        await fs.remove(destination);
        return;
    }
    await fs.ensureDir(path.dirname(destination));
    await fs.copy(file, destination, { overwrite: true });
}
