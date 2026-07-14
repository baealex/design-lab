import * as assert from 'node:assert/strict';
import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, test } from 'node:test';

import {
    composeHtml,
    DependencyGraph,
    injectDevClient,
    LabCompilerError,
    parsePage,
    serializePageData,
    toLabBuildError,
} from '../compiler';

const temporaryDirectories: string[] = [];

afterEach(async () => {
    await Promise.all(temporaryDirectories.splice(0).map(directory => fs.remove(directory)));
});

async function createComposerFixture(layout: string, partials: Record<string, string> = {}) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'design-lab-'));
    temporaryDirectories.push(root);
    const layoutsPath = path.join(root, 'layouts');
    const partialsPath = path.join(root, 'partials');
    await fs.ensureDir(layoutsPath);
    await fs.ensureDir(partialsPath);
    await fs.writeFile(path.join(layoutsPath, 'base.html'), layout);
    await Promise.all(Object.entries(partials).map(([name, source]) => {
        return fs.writeFile(path.join(partialsPath, `${name}.html`), source);
    }));
    return { layoutsPath, partialsPath };
}

test('Page parser preserves the original style, body, and script blocks', () => {
    const source = [
        '<!-- layout: base.html -->',
        '<!-- title: Example -->',
        '<!-- description: Parser fixture -->',
        '<style>body > main { color: red; }</style>',
        '<!-- lab:template -->',
        '<body><main data-value="<raw>">Hello</main></body>',
        '<script>var closing = "body";</script>',
    ].join('\n');

    assert.deepEqual(parsePage(source, 'fixture.html'), {
        metadata: {
            layout: 'base.html',
            title: 'Example',
            description: 'Parser fixture',
        },
        style: 'body > main { color: red; }',
        body: '<main data-value="<raw>">Hello</main>',
        script: 'var closing = "body";',
    });
});

test('Page parser requires one template marker immediately before an explicit body', () => {
    const metadata = [
        '<!-- layout: base.html -->',
        '<!-- title: Example -->',
    ].join('\n');

    assert.throws(
        () => parsePage(`${metadata}\n<body></body>`, 'missing.html'),
        /Missing required Page template marker/,
    );

    assert.throws(
        () => parsePage([
            metadata,
            '<!-- lab:template -->',
            '<!-- lab:template -->',
            '<body></body>',
        ].join('\n'), 'duplicate.html'),
        /Duplicate Page template marker/,
    );

    assert.throws(
        () => parsePage([
            metadata,
            '<!-- lab:template -->',
            '<!-- unrelated -->',
            '<body></body>',
        ].join('\n'), 'separated.html'),
        /must be followed immediately by an explicit <body> block/,
    );

    assert.throws(
        () => parsePage(`${metadata}\n<!-- lab:template -->\n<body>`, 'unclosed.html'),
        /<body> must have an explicit closing tag/,
    );
});

test('Composer expands nested Partials, fills slots, and keeps fallback content', async () => {
    const fixture = await createComposerFixture(
        '<html><head><lab:slot name="title"></lab:slot></head><body><lab:slot name="body"></lab:slot><lab:use partial="outer"></lab:use><lab:slot name="footer"><footer>Fallback</footer></lab:slot></body></html>',
        {
            outer: '<section>Outer <lab:use partial="inner"></lab:use></section>',
            inner: '<strong id="nested-partial">Inner</strong>',
        },
    );

    const result = composeHtml('base.html', {
        title: '<title>Fixture</title>',
        body: '<main id="content">Body</main>',
    }, fixture);

    assert.match(result.html, /<title>Fixture<\/title>/);
    assert.match(result.html, /<section>Outer <strong id="nested-partial">Inner<\/strong><\/section>/);
    assert.match(result.html, /<footer>Fallback<\/footer>/);
    assert.doesNotMatch(result.html, /<lab:/);
    assert.equal(result.dependencies.length, 3);
});

test('Composer reports missing, invalid, and cyclic Partials', async () => {
    const missing = await createComposerFixture(
        '<html><head><lab:slot name="title"></lab:slot></head><body><lab:slot name="body"></lab:slot><lab:use partial="missing"></lab:use></body></html>',
    );
    assert.throws(
        () => composeHtml('base.html', { title: '', body: '' }, missing),
        (error: unknown) => error instanceof Error && /Partial not found/.test(error.message),
    );

    const invalid = await createComposerFixture(
        '<html><head><lab:slot name="title"></lab:slot></head><body><lab:slot name="body"></lab:slot><lab:use partial="../secret"></lab:use></body></html>',
    );
    assert.throws(
        () => composeHtml('base.html', { title: '', body: '' }, invalid),
        (error: unknown) => error instanceof Error && /Invalid Partial name/.test(error.message),
    );

    const cycle = await createComposerFixture(
        '<html><head><lab:slot name="title"></lab:slot></head><body><lab:slot name="body"></lab:slot><lab:use partial="first"></lab:use></body></html>',
        {
            first: '<lab:use partial="second"></lab:use>',
            second: '<lab:use partial="first"></lab:use>',
        },
    );
    assert.throws(
        () => composeHtml('base.html', { title: '', body: '' }, cycle),
        (error: unknown) => error instanceof Error && /first → second → first/.test(error.message),
    );
});

test('Composer rejects malformed directives, missing required slots, and duplicate ids', async () => {
    const unknown = await createComposerFixture(
        '<html><head><lab:slot name="title"></lab:slot></head><body><lab:slot name="body"></lab:slot><lab:if></lab:if></body></html>',
    );
    assert.throws(
        () => composeHtml('base.html', { title: '', body: '' }, unknown),
        /Unknown Lab directive/,
    );

    const missingSlot = await createComposerFixture(
        '<html><head><lab:slot name="title"></lab:slot></head><body></body></html>',
    );
    assert.throws(
        () => composeHtml('base.html', { title: '' }, missingSlot),
        /Missing required Layout slot: body/,
    );

    const duplicateId = await createComposerFixture(
        '<html><head><lab:slot name="title"></lab:slot></head><body><div id="same"></div><lab:slot name="body"></lab:slot></body></html>',
    );
    assert.throws(
        () => composeHtml('base.html', { title: '', body: '<main id="same"></main>' }, duplicateId),
        /Duplicate id in composed HTML: same/,
    );
});

test('Development client injection is external and occurs before the closing body tag', () => {
    const html = '<!DOCTYPE html><html><head></head><body><main></main></body></html>';
    const result = injectDevClient(html, 'fixture.html');
    assert.match(result, /<script src="\/socket\.io\/socket\.io\.js"><\/script>/);
    assert.match(result, /<script src="\/__lab\/client\.js"><\/script>\n<\/body>/);
});

test('Page data serialization cannot terminate its script element', () => {
    const result = serializePageData({ value: '</script>&\u2028\u2029' });
    assert.equal(result.includes('</script>'), false);
    assert.match(result, /\\u003c\/script\\u003e\\u0026\\u2028\\u2029/);
});

test('Dependency graph supports forward and reverse lookups', () => {
    const graph = new DependencyGraph();
    graph.updatePage('one', ['/tmp/base.html', '/tmp/tools.html']);
    graph.updatePage('two', ['/tmp/base.html']);
    assert.deepEqual(graph.getAffectedPages('/tmp/base.html').sort(), ['one', 'two']);
    assert.equal(graph.getDependencies('one').length, 2);

    graph.removePage('one');
    assert.deepEqual(graph.getAffectedPages('/tmp/tools.html'), []);
});

test('Compiler errors retain their typed build stage after transpilation', () => {
    const error = new LabCompilerError({
        stage: 'compose',
        file: 'layout.html',
        message: 'Broken directive',
    });
    assert.equal(error instanceof LabCompilerError, true);
    assert.equal(toLabBuildError(error, { stage: 'emit', file: 'fallback' }).stage, 'compose');
});
