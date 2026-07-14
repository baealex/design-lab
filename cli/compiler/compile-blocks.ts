import { minifyScript } from '../modules/transpile/typescript';
import { LabCompilerError } from './errors';
import type { PageDefinition } from './parse-page';

export interface CompileOptions {
    isDev: boolean;
    file: string;
}

export interface CompiledBlocks {
    title: string;
    style: string;
    body: string;
    script: string;
}

export async function compileBlocks(
    page: PageDefinition,
    options: CompileOptions,
): Promise<CompiledBlocks> {
    let script = '';
    try {
        script = page.script ? await minifyScript(page.script, { isDev: options.isDev }) : '';
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new LabCompilerError({
            stage: 'script',
            file: options.file,
            message,
            detail: error instanceof Error ? error.stack : undefined,
        });
    }

    return {
        title: page.metadata.title,
        style: page.style ?? '',
        body: page.body,
        script,
    };
}

