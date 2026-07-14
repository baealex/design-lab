import { compileBlocks } from './compile-blocks';
import { composeHtml, injectDevClient } from './compose-html';
import { prepareAssets, type PreparedFile } from './emit-assets';
import type { GlobalAssets } from './global-assets';
import { parsePage, type PageDefinition } from './parse-page';

export interface BuildPageOptions {
    isDev?: boolean;
    data?: Record<string, unknown>;
    globalAssets: GlobalAssets;
    file: string;
}

export interface CompiledPage {
    html: string;
    dependencies: string[];
    definition: PageDefinition;
    files: PreparedFile[];
}

export async function compilePage(
    pageName: string,
    source: string,
    options: BuildPageOptions,
): Promise<CompiledPage> {
    const isDev = options.isDev ?? false;
    const definition = parsePage(source, options.file);
    const compiled = await compileBlocks(definition, { isDev, file: options.file });
    const assets = prepareAssets(pageName, compiled, {
        isDev,
        role: 'page',
        data: options.data,
    });
    const pageScripts = [assets.script, compiled.inlineScript].filter(Boolean).join('\n');
    const composition = composeHtml(definition.metadata.layout, {
        title: assets.title,
        'global-style': options.globalAssets.style,
        style: compiled.inlineStyle || assets.style,
        body: assets.body,
        'global-script': options.globalAssets.script,
        script: pageScripts,
    }, {
        isDev,
        pageFile: options.file,
    });

    return {
        html: isDev ? injectDevClient(composition.html, options.file) : composition.html,
        dependencies: composition.dependencies,
        definition,
        files: assets.files,
    };
}
