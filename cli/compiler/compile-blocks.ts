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

export interface CompiledPageBlocks extends CompiledBlocks {
    inlineStyle: string;
    inlineScript: string;
}

export async function compileBlocks(
    page: PageDefinition,
    options: CompileOptions,
): Promise<CompiledPageBlocks> {
    let script = '';
    try {
        script = page.script?.mode === 'bundle'
            ? await minifyScript(page.script.content, { isDev: options.isDev })
            : '';
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
        style: page.style?.mode === 'bundle' ? page.style.content : '',
        body: page.body,
        script,
        inlineStyle: page.style?.mode === 'inline' ? page.style.html : '',
        inlineScript: page.script?.mode === 'inline' ? page.script.html : '',
    };
}
