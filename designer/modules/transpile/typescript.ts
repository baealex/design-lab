import {
    ModuleKind,
    ScriptTarget,
    transpileModule,
} from 'typescript';
import { minify } from 'uglify-js';

export interface TypescriptTranspileOption {
    ignoreError?: boolean;
}

export function typescriptTranspile(source: string, options?: TypescriptTranspileOption) {
    try {
        const transpile = transpileModule(source, {
            compilerOptions: {
                target: ScriptTarget.ES5,
                module: ModuleKind.CommonJS
            }
        });
        const { code } = minify(transpile.outputText);
        return code;
    } catch(e) {
        if (options?.ignoreError !== true) {
            throw e;
        } 
        console.log(e);
    }
    return '';
}