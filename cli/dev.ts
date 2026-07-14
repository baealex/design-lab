import * as path from 'path';

import { prepareGlobalAssets, toLabBuildError } from './compiler';
import {
    buildAll,
    commitBuild,
    copyPublicChange,
    DIST_PATH,
    getAffectedPages,
    getGlobalAssets,
    getPages,
    getPagesData,
    getPagesUsingLayout,
    GLOBAL_PATH,
    LAYOUTS_PATH,
    PAGES_PATH,
    PARTIALS_PATH,
    preparePages,
    PUBLIC_PATH,
    refreshPages,
    SOURCE_PATH,
    classifyPageChange,
} from './compiler/project-builder';
import { createDevServer } from './dev/server';
import type { LabUpdate } from './dev/protocol';
import { LabWatcher, type SourceChange } from './dev/watcher';

const server = createDevServer({
    port: 8888,
    distPath: DIST_PATH,
    getPagesData,
});

let buildSequence = 0;

function nextBuildId() {
    buildSequence += 1;
    return `${Date.now().toString(36)}-${buildSequence.toString(36)}`;
}

function pageNameFromFile(file: string): string | undefined {
    const relative = path.relative(PAGES_PATH, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return undefined;
    return relative.split(path.sep)[0] || undefined;
}

async function rebuild(changes: SourceChange[]) {
    const buildId = nextBuildId();
    const startedAt = Date.now();
    server.buildStart({ buildId, files: changes.map(change => path.relative(SOURCE_PATH, change.file)) });

    try {
        const pageChanges = changes.filter(change => path.resolve(change.file).startsWith(`${PAGES_PATH}${path.sep}`));
        const layoutChanges = changes.filter(change => path.resolve(change.file).startsWith(`${LAYOUTS_PATH}${path.sep}`));
        const partialChanges = changes.filter(change => path.resolve(change.file).startsWith(`${PARTIALS_PATH}${path.sep}`));
        const globalChanges = changes.filter(change => path.resolve(change.file).startsWith(`${GLOBAL_PATH}${path.sep}`));
        const publicChanges = changes.filter(change => path.resolve(change.file).startsWith(`${PUBLIC_PATH}${path.sep}`));

        const pageSet = new Set<string>();
        const clientPageSet = new Set<string>();
        const structurePageSet = new Set<string>();
        let hasNonStylePageChange = false;
        let hasPageStyleChange = false;
        let indexDataChanged = false;
        let removedPages: string[] = [];

        if (pageChanges.some(change => change.event === 'add' || change.event === 'unlink')) {
            const refreshed = refreshPages();
            removedPages = refreshed.removed;
            refreshed.added.forEach(page => {
                pageSet.add(page);
                clientPageSet.add(page);
            });
            refreshed.removed.forEach(page => clientPageSet.add(page));
            if (refreshed.added.length || refreshed.removed.length) {
                pageSet.add('index');
                indexDataChanged = true;
                hasNonStylePageChange = true;
            }
        }

        for (const change of pageChanges) {
            const page = pageNameFromFile(change.file);
            if (!page || !getPages().includes(page) || change.event === 'unlink') continue;

            const classification = classifyPageChange(page);
            if (classification.kind === 'none') continue;
            pageSet.add(page);
            clientPageSet.add(page);
            if (classification.kind === 'style') {
                hasPageStyleChange = true;
            } else {
                hasNonStylePageChange = true;
                if (page !== 'index') pageSet.add('index');
            }
            if (classification.metadataChanged) indexDataChanged = true;
        }

        for (const change of layoutChanges) {
            const affected = new Set([
                ...getAffectedPages(change.file),
                ...getPagesUsingLayout(change.file),
            ]);
            affected.forEach(page => {
                pageSet.add(page);
                structurePageSet.add(page);
            });
        }

        for (const change of partialChanges) {
            getAffectedPages(change.file).forEach(page => {
                pageSet.add(page);
                structurePageSet.add(page);
            });
        }

        const preparedGlobal = globalChanges.length
            ? await prepareGlobalAssets({ isDev: true })
            : undefined;
        const availablePages = new Set(getPages());
        const preparedPages = await preparePages(
            Array.from(pageSet).filter(page => availablePages.has(page)),
            {
                isDev: true,
                global: preparedGlobal?.assets ?? getGlobalAssets(),
            },
        );

        await commitBuild({
            global: preparedGlobal,
            pages: preparedPages,
            removedPages,
        });
        for (const change of publicChanges) {
            await copyPublicChange(change.event, change.file);
        }

        const durationMs = Date.now() - startedAt;
        server.buildComplete({ buildId, durationMs });

        const globalScriptChanged = globalChanges.some(change => path.extname(change.file) === '.js');
        if (globalScriptChanged || publicChanges.length) {
            server.update({
                buildId,
                kind: globalScriptChanged ? 'global' : 'public',
                pages: getPages(),
                strategy: 'reload-all',
            });
            console.log(`Lab build ${buildId}: ${durationMs}ms, reload all`);
            return;
        }

        if (globalChanges.length) {
            server.update({
                buildId,
                kind: 'global',
                pages: getPages(),
                strategy: 'patch-style',
            });
        }

        let pageUpdate: LabUpdate | undefined;
        if (structurePageSet.size) {
            pageUpdate = {
                buildId,
                kind: partialChanges.length ? 'partial' : 'layout',
                pages: Array.from(new Set([
                    ...Array.from(structurePageSet),
                    ...Array.from(clientPageSet),
                ])),
                strategy: 'reload-page',
            };
        } else if (clientPageSet.size && hasNonStylePageChange) {
            pageUpdate = {
                buildId,
                kind: 'page',
                pages: Array.from(clientPageSet),
                strategy: 'reload-page',
                indexDataChanged,
            };
        } else if (clientPageSet.size && hasPageStyleChange) {
            pageUpdate = {
                buildId,
                kind: 'style',
                pages: Array.from(clientPageSet),
                strategy: 'patch-style',
            };
        }

        if (pageUpdate) server.update(pageUpdate);
        console.log(`Lab build ${buildId}: ${durationMs}ms`);
    } catch (error) {
        const fallbackFile = changes[0]?.file ?? SOURCE_PATH;
        const buildError = toLabBuildError(error, { stage: 'emit', file: fallbackFile });
        server.error(buildError);
        console.error(`[${buildError.stage}] ${buildError.file}: ${buildError.message}`);
    }
}

(async () => {
    const buildId = nextBuildId();
    const startedAt = Date.now();
    server.buildStart({ buildId, files: ['initial'] });

    try {
        await buildAll({ isDev: true });
        server.buildComplete({ buildId, durationMs: Date.now() - startedAt });
    } catch (error) {
        server.error(toLabBuildError(error, { stage: 'emit', file: SOURCE_PATH }));
    }

    new LabWatcher([
        PAGES_PATH,
        LAYOUTS_PATH,
        PARTIALS_PATH,
        GLOBAL_PATH,
        PUBLIC_PATH,
    ], rebuild).start();
})();
