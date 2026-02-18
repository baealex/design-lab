import { minifyScript } from '../transpile/typescript';
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

    return source.replace(/\$DATA\.(\w+)/g, (match, key) => {
        if (key in data) {
            return JSON.stringify(data[key]);
        }
        return match;
    });
}

export async function compileBlocks(page: PageDefinition, options: CompileOptions): Promise<CompiledBlocks> {
    const { isDev, data } = options;

    const style = page.style ?? '';

    const scriptSource = injectData(page.script, data);
    const script = scriptSource
        ? await minifyScript(scriptSource, { isDev })
        : '';

    return {
        title: page.metadata.title,
        style,
        body: page.body,
        script,
    };
}
