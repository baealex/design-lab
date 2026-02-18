import { parsePage } from './parse-page';
import { compileBlocks } from './compile-blocks';
import { emitAssets } from './emit-assets';
import { assembleHtml } from './assemble-html';

export interface BuildOptions {
    isDev?: boolean;
    data?: Record<string, unknown>;
}

export async function buildPage(pageName: string, source: string, options: BuildOptions = {}) {
    const { isDev = false, data } = options;

    const page = parsePage(source);
    const compiled = await compileBlocks(page, { isDev, data });
    const assets = await emitAssets(pageName, compiled, { isDev });
    const html = assembleHtml(page.metadata.layout, assets);

    return html;
}
