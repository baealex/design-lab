import { expect, test } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');
const GLASS_PAGE = path.join(ROOT, 'src/pages/design-2020-glassmorphism/index.html');
const BASE_LAYOUT = path.join(ROOT, 'src/layouts/base.html');
const GLOBAL_STYLE = path.join(ROOT, 'src/global/index.scss');
const GLASS_OUTPUT = path.join(ROOT, 'dist/design-2020-glassmorphism.html');

async function waitForPreview(page: import('@playwright/test').Page) {
    const iframe = page.locator('#preview-iframe');
    await expect(iframe).toHaveAttribute('src', /design-2020-glassmorphism/);
    await expect.poll(async () => iframe.evaluate((element: HTMLIFrameElement) => {
        return element.contentDocument?.readyState;
    })).toBe('complete');
    return iframe;
}

test('catalog and 404 pages run without browser errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('/#design-2020-glassmorphism');
    await expect(page).toHaveTitle('Design Lab — BaeJino');
    await expect(page.locator('#catalog-total')).toHaveText('27');
    await waitForPreview(page);
    await expect(page.locator('#__lab-hud')).toBeAttached();

    await page.goto('/404');
    await expect(page).toHaveTitle('Not Found');
    await expect(page.getByRole('heading', { name: 'Oops, there\'s nothing here.' })).toBeVisible();
    expect(errors).toEqual([]);
});

test('socket reconnect restores the current development state', async ({ page }) => {
    await page.goto('/design-2020-glassmorphism');
    await expect(page.locator('#__lab-hud')).toBeAttached();

    await page.evaluate(() => {
        const labWindow = window as typeof window & {
            __labDev: { socket: { disconnect: () => void } };
        };
        labWindow.__labDev.socket.disconnect();
    });
    await expect(page.locator('#__lab-status')).toHaveAttribute('data-state', 'offline');

    await page.evaluate(() => {
        const labWindow = window as typeof window & {
            __labDev: { socket: { connect: () => void } };
        };
        labWindow.__labDev.socket.connect();
    });
    await expect(page.locator('#__lab-status')).toHaveAttribute('data-state', 'ready');
});

test('Page style changes patch CSS without reload or scroll loss', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Source mutation runs once.');

    const original = await fs.readFile(GLASS_PAGE, 'utf8');
    const changed = original.replace('</style>', '    /* e2e-style-patch */\n</style>');

    await page.goto('/design-2020-glassmorphism');
    const style = page.locator('link[data-lab-style="page"]');
    const initialHref = await style.getAttribute('href');
    await page.evaluate(() => {
        document.scrollingElement!.scrollTop = 500;
        (window as typeof window & { __labMarker?: string }).__labMarker = 'preserved';
    });
    const initialScroll = await page.evaluate(() => document.scrollingElement!.scrollTop);

    try {
        await fs.writeFile(GLASS_PAGE, changed);
        await expect.poll(() => style.getAttribute('href')).not.toBe(initialHref);
        await expect.poll(() => page.evaluate(() => {
            return (window as typeof window & { __labMarker?: string }).__labMarker;
        })).toBe('preserved');
        expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(initialScroll);
    } finally {
        const patchedHref = await style.getAttribute('href');
        await fs.writeFile(GLASS_PAGE, original);
        await expect.poll(() => style.getAttribute('href')).not.toBe(patchedHref);
    }
});

test('index keeps its state while only the active preview iframe reloads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Source mutation runs once.');

    const original = await fs.readFile(GLASS_PAGE, 'utf8');
    const changed = original.replace('</body>', '    <!-- e2e-body-reload -->\n</body>');
    await page.goto('/#design-2020-glassmorphism');
    const iframe = await waitForPreview(page);
    await page.evaluate(() => {
        (window as typeof window & { __labMarker?: string }).__labMarker = 'index-preserved';
    });
    const initialTime = await iframe.evaluate((element: HTMLIFrameElement) => {
        return element.contentWindow!.performance.timeOrigin;
    });

    try {
        await fs.writeFile(GLASS_PAGE, changed);
        await expect.poll(() => iframe.evaluate((element: HTMLIFrameElement) => {
            return element.contentWindow!.performance.timeOrigin;
        })).not.toBe(initialTime);
        expect(await page.evaluate(() => {
            return (window as typeof window & { __labMarker?: string }).__labMarker;
        })).toBe('index-preserved');
    } finally {
        const changedTime = await iframe.evaluate((element: HTMLIFrameElement) => {
            return element.contentWindow!.performance.timeOrigin;
        });
        await fs.writeFile(GLASS_PAGE, original);
        await expect.poll(() => iframe.evaluate((element: HTMLIFrameElement) => {
            return element.contentWindow!.performance.timeOrigin;
        })).not.toBe(changedTime);
    }
});

test('Global style changes patch the index and its preview without reload', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Source mutation runs once.');

    const original = await fs.readFile(GLOBAL_STYLE, 'utf8');
    const changed = `${original}\n/* e2e-global-style-patch */\n`;
    await page.goto('/#design-2020-glassmorphism');
    const iframe = await waitForPreview(page);
    const globalStyle = page.locator('link[data-lab-style="global"]');
    const initialHref = await globalStyle.getAttribute('href');
    await page.evaluate(() => {
        (window as typeof window & { __labMarker?: string }).__labMarker = 'global-preserved';
    });

    try {
        await fs.writeFile(GLOBAL_STYLE, changed);
        await expect.poll(() => globalStyle.getAttribute('href')).not.toBe(initialHref);
        await expect.poll(() => iframe.evaluate((element: HTMLIFrameElement) => {
            return element.contentDocument
                ?.querySelector('link[data-lab-style="global"]')
                ?.getAttribute('href');
        })).toContain('?lab=');
        expect(await page.evaluate(() => {
            return (window as typeof window & { __labMarker?: string }).__labMarker;
        })).toBe('global-preserved');
    } finally {
        const patchedHref = await globalStyle.getAttribute('href');
        await fs.writeFile(GLOBAL_STYLE, original);
        await expect.poll(() => globalStyle.getAttribute('href')).not.toBe(patchedHref);
    }
});

test('Page metadata refreshes the index data without reloading the index', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Source mutation runs once.');

    const original = await fs.readFile(GLASS_PAGE, 'utf8');
    const originalDescription = 'That simple recipe actually worked';
    const changedDescription = 'E2E metadata update without an index reload';
    const changed = original.replace(originalDescription, changedDescription);
    await page.goto('/#design-2020-glassmorphism');
    await waitForPreview(page);
    await page.evaluate(() => {
        (window as typeof window & { __labMarker?: string }).__labMarker = 'metadata-preserved';
    });

    try {
        await fs.writeFile(GLASS_PAGE, changed);
        await expect(page.locator('#preview-desc')).toHaveText(changedDescription);
        expect(await page.evaluate(() => {
            return (window as typeof window & { __labMarker?: string }).__labMarker;
        })).toBe('metadata-preserved');
    } finally {
        await fs.writeFile(GLASS_PAGE, original);
        await expect(page.locator('#preview-desc')).toHaveText(originalDescription);
    }
});

test('build errors keep the last output and expose an accessible diagnostic', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Source mutation runs once.');

    const originalLayout = await fs.readFile(BASE_LAYOUT, 'utf8');
    const invalidLayout = originalLayout.replace(
        '<lab:slot name="global-script"></lab:slot>',
        '<lab:use partial="e2e-missing"></lab:use>\n    <lab:slot name="global-script"></lab:slot>',
    );
    const lastGoodOutput = await fs.readFile(GLASS_OUTPUT, 'utf8');

    await page.goto('/design-2020-glassmorphism');
    try {
        await fs.writeFile(BASE_LAYOUT, invalidLayout);
        const diagnostic = page.locator('#__lab-error');
        await expect(diagnostic).toBeVisible();
        await expect(diagnostic).toContainText('Partial not found: e2e-missing');
        await diagnostic.focus();
        await expect(diagnostic).toBeFocused();
        expect(await fs.readFile(GLASS_OUTPUT, 'utf8')).toBe(lastGoodOutput);
    } finally {
        await fs.writeFile(BASE_LAYOUT, originalLayout);
        await expect(page.locator('#__lab-error')).toBeHidden();
    }
});
