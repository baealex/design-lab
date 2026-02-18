import * as fs from 'fs-extra';
import * as crypto from 'crypto';

import type { CompiledBlocks } from './compile-blocks';

export interface EmitOptions {
    isDev: boolean;
}

export interface EmittedAssets {
    title: string;
    style: string;
    body: string;
    script: string;
}

function createHash(key: string, text: string): string {
    return crypto.createHmac('md5', key).update(text).digest('hex');
}

export async function emitAssets(pageName: string, blocks: CompiledBlocks, options: EmitOptions): Promise<EmittedAssets> {
    const { isDev } = options;

    const title = `<title>${blocks.title}</title>`;

    let style: string;
    if (!blocks.style) {
        style = '';
    } else if (isDev) {
        style = `<style>${blocks.style}</style>`;
    } else {
        const hash = createHash(pageName + 'style', blocks.style);
        const fileName = `${pageName}.${hash}.css`;
        await fs.writeFile(`./dist/assets/styles/${fileName}`, blocks.style);
        style = `<link href="/assets/styles/${fileName}" rel="stylesheet"/>`;
    }

    let script: string;
    if (!blocks.script) {
        script = '';
    } else if (isDev) {
        script = `<script>(function(){${blocks.script}\n})();</script>`;
    } else {
        const hash = createHash(pageName + 'script', blocks.script);
        const fileName = `${pageName}.${hash}.js`;
        await fs.writeFile(`./dist/assets/scripts/${fileName}`, `(function(){${blocks.script}})();`);
        script = `<script src="/assets/scripts/${fileName}"></script>`;
    }

    return {
        title,
        style,
        body: blocks.body,
        script,
    };
}
