import { scssTranspile } from '../transpile/scss';
import { typescriptTranspile } from '../transpile/typescript';
import type { PageDefinition } from './parse-page';

export interface CompileOptions {
    isDev: boolean;
    data?: Record<string, unknown>;
}

export interface CompiledBlocks {
    title: string;
    style: string;
    body: string;
    script: string;
}

function injectData(source: string, data?: Record<string, unknown>): string {
    if (!data) return source;

    const declarations = Object.entries(data)
        .map(([key, value]) => `const $DATA = { ${key}: ${JSON.stringify(value)} };`)
        .join('\n');

    return source.replace(/\$DATA\.(\w+)/g, (match, key) => {
        if (key in data) {
            return JSON.stringify(data[key]);
        }
        return match;
    });
}

export async function compileBlocks(page: PageDefinition, options: CompileOptions): Promise<CompiledBlocks> {
    const { isDev, data } = options;

    const style = page.style
        ? scssTranspile(page.style, { isDev })
        : '';

    const scriptSource = injectData(page.script, data);
    const script = scriptSource
        ? await typescriptTranspile(scriptSource, { isDev })
        : '';

    return {
        title: page.metadata.title,
        style,
        body: page.body,
        script,
    };
}
