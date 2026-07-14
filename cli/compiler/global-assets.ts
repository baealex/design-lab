import * as path from 'path';
import * as fs from 'fs-extra';
import * as sass from 'sass';

import { minifyScript } from '../modules/transpile/typescript';
import { type CompiledBlocks } from './compile-blocks';
import { LabCompilerError } from './errors';
import { prepareAssets, type PreparedFile } from './emit-assets';

const GLOBAL_PATH = path.resolve('src/global');

export interface GlobalAssets {
    style: string;
    script: string;
}

export interface PreparedGlobalAssets {
    assets: GlobalAssets;
    files: PreparedFile[];
}

export interface BuildGlobalOptions {
    isDev: boolean;
}

function compileStyle(options: BuildGlobalOptions): string {
    const file = path.join(GLOBAL_PATH, 'index.scss');
    try {
        return sass.compile(file, {
            loadPaths: [GLOBAL_PATH],
            style: options.isDev ? 'expanded' : 'compressed',
        }).css;
    } catch (error) {
        const exception = error as sass.Exception;
        throw new LabCompilerError({
            stage: 'style',
            file,
            line: exception.span?.start.line === undefined ? undefined : exception.span.start.line + 1,
            column: exception.span?.start.column === undefined ? undefined : exception.span.start.column + 1,
            message: exception.message ?? String(error),
            detail: exception.stack,
        });
    }
}

export async function prepareGlobalAssets(options: BuildGlobalOptions): Promise<PreparedGlobalAssets> {
    const scriptFile = path.join(GLOBAL_PATH, 'index.js');
    const scriptSource = await fs.readFile(scriptFile, 'utf8');
    let script: string;
    try {
        script = await minifyScript(scriptSource, options);
    } catch (error) {
        throw new LabCompilerError({
            stage: 'script',
            file: scriptFile,
            message: error instanceof Error ? error.message : String(error),
            detail: error instanceof Error ? error.stack : undefined,
        });
    }

    const blocks: CompiledBlocks = {
        title: '',
        style: compileStyle(options),
        body: '',
        script,
    };
    const prepared = prepareAssets('global', blocks, {
        ...options,
        role: 'global',
    });

    return {
        assets: {
            style: prepared.style,
            script: prepared.script,
        },
        files: prepared.files,
    };
}

