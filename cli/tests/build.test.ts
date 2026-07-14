import * as assert from 'node:assert/strict';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { test } from 'node:test';

import baseline = require('./fixtures/build-baseline.json');
import { buildAll, DIST_PATH, getPages, getPagesData } from '../compiler/project-builder';

function assetNames(directory: string): string[] {
    return fs.readdirSync(path.join(DIST_PATH, directory)).sort();
}

test('Production build preserves the full Page baseline and emits reproducible hashed assets', async () => {
    await buildAll();

    assert.deepEqual(getPages(), baseline.pages);
    assert.equal(getPages().length, baseline.pageCount);
    assert.equal(getPagesData().length, baseline.catalogCount);

    const firstAssets = {
        styles: assetNames('assets/styles'),
        scripts: assetNames('assets/scripts'),
    };
    const globalStyles = new Set<string>();

    baseline.pages.forEach(page => {
        const html = fs.readFileSync(path.join(DIST_PATH, `${page}.html`), 'utf8');
        assert.match(html, /<title>[^<]+<\/title>/);
        assert.doesNotMatch(html, /<lab:|\$DATA|\/__lab\/|socket\.io\/socket\.io\.js/);
        const globalStyle = html.match(/href="(\/assets\/styles\/global\.[a-f0-9]+\.css)"/)?.[1];
        assert.ok(globalStyle, `${page} must reference the hashed global stylesheet`);
        globalStyles.add(globalStyle);
    });
    assert.equal(globalStyles.size, 1);

    await buildAll();
    assert.deepEqual(assetNames('assets/styles'), firstAssets.styles);
    assert.deepEqual(assetNames('assets/scripts'), firstAssets.scripts);
});

test('Development build uses stable assets and includes only external runtime tags', async () => {
    await buildAll({ isDev: true });
    const html = fs.readFileSync(path.join(DIST_PATH, 'index.html'), 'utf8');

    assert.match(html, /href="\/assets\/styles\/global\.css"[^>]+data-lab-style="global"/);
    assert.match(html, /href="\/assets\/styles\/index\.css"[^>]+data-lab-style="page"/);
    assert.match(html, /<script id="lab-page-data" type="application\/json">/);
    assert.match(html, /<script src="\/socket\.io\/socket\.io\.js"><\/script>/);
    assert.match(html, /<script src="\/__lab\/client\.js"><\/script>/);
    assert.doesNotMatch(html, /\$DATA|<lab:/);
});
