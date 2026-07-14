import * as fs from 'fs-extra';
import * as path from 'path';
import * as sass from 'sass';

import { reportError, clearError } from '../error-reporter';
import { minifyScript } from '../transpile/typescript';
import { emitAssets } from './emit-assets';
import type { CompiledBlocks } from './compile-blocks';
import type { GlobalAssets } from './assemble-html';

const GLOBAL_PATH = './src/global';

export interface BuildGlobalOptions {
    isDev: boolean;
}

function compileStyle({ isDev }: BuildGlobalOptions): string {
    try {
        const result = sass.compile(path.resolve(`${GLOBAL_PATH}/index.scss`), {
            loadPaths: [path.resolve(GLOBAL_PATH)],
            style: isDev ? 'expanded' : 'compressed',
        });
        if (isDev) clearError();
        return result.css;
    } catch (error) {
        if (!isDev) throw error;

        const message = error instanceof Error ? error.message : String(error);
        reportError(`[Global style] ${message}`);
        console.log(error);
        return '';
    }
}

export async function buildGlobalAssets(options: BuildGlobalOptions): Promise<GlobalAssets> {
    const scriptSource = (await fs.readFile(`${GLOBAL_PATH}/index.js`)).toString();
    const script = await minifyScript(scriptSource, options);
    const style = compileStyle(options);

    const blocks: CompiledBlocks = {
        title: '',
        style,
        body: '',
        script,
    };
    const assets = await emitAssets('global', blocks, options);

    return {
        style: assets.style,
        script: assets.script,
    };
}
