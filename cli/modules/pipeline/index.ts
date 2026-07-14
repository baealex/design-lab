import { parsePage } from './parse-page';
import { compileBlocks } from './compile-blocks';
import { emitAssets } from './emit-assets';
import { assembleHtml, type GlobalAssets } from './assemble-html';

export interface BuildOptions {
    isDev?: boolean;
    data?: Record<string, unknown>;
    globalAssets: GlobalAssets;
}

export async function buildPage(pageName: string, source: string, options: BuildOptions) {
    const { isDev = false, data, globalAssets } = options;

    const page = parsePage(source);
    const compiled = await compileBlocks(page, { isDev, data });
    const assets = await emitAssets(pageName, compiled, { isDev });
    const html = assembleHtml(page.metadata.layout, assets, globalAssets);

    return html;
}

export { buildGlobalAssets } from './global-assets';
export type { GlobalAssets } from './assemble-html';
