import {
    ModuleKind,
    ScriptTarget,
    transpileModule,
} from 'typescript';
import { minify } from 'terser';

import { reportError, clearError } from '../error-reporter';

export interface TypescriptTranspileOption {
    isDev?: boolean;
}

export async function typescriptTranspile(source: string, options?: TypescriptTranspileOption) {
    try {
        const result = transpileModule(source, {
            compilerOptions: {
                target: ScriptTarget.ESNext,
                module: ModuleKind.ESNext,
                ...(options?.isDev && {
                    inlineSourceMap: true,
                    inlineSources: true,
                }),
            }
        });

        if (options?.isDev) {
            clearError();
            return result.outputText;
        }

        const minified = await minify(result.outputText);
        return minified.code ?? '';
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (options?.isDev) {
            reportError(`[TypeScript] ${message}`);
            console.log(e);
            return '';
        }
        throw e;
    }
}
