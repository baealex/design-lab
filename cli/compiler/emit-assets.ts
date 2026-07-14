import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

import { LabCompilerError } from './errors';
import type { CompiledBlocks } from './compile-blocks';

export interface EmitOptions {
    isDev: boolean;
    role?: 'page' | 'global';
    data?: Record<string, unknown>;
}

export interface PreparedFile {
    path: string;
    contents: string | Buffer;
}

export interface PreparedAssets {
    title: string;
    style: string;
    body: string;
    script: string;
    files: PreparedFile[];
}

function createHash(key: string, text: string): string {
    return crypto.createHmac('md5', key).update(text).digest('hex');
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function serializePageData(data: Record<string, unknown>): string {
    return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, character => {
        const escapes: Record<string, string> = {
            '<': '\\u003c',
            '>': '\\u003e',
            '&': '\\u0026',
            '\u2028': '\\u2028',
            '\u2029': '\\u2029',
        };
        return escapes[character];
    });
}

function assetFileName(name: string, kind: 'style' | 'script', source: string, isDev: boolean): string {
    const extension = kind === 'style' ? 'css' : 'js';
    if (isDev) return `${name}.${extension}`;
    return `${name}.${createHash(name + kind, source)}.${extension}`;
}

export function prepareAssets(
    name: string,
    blocks: CompiledBlocks,
    options: EmitOptions,
): PreparedAssets {
    const role = options.role ?? 'page';
    const files: PreparedFile[] = [];
    const title = `<title>${escapeHtml(blocks.title)}</title>`;

    let style = '';
    if (blocks.style) {
        const fileName = assetFileName(name, 'style', blocks.style, options.isDev);
        files.push({
            path: `assets/styles/${fileName}`,
            contents: blocks.style,
        });
        const devAttributes = options.isDev
            ? ` data-lab-style="${role}"${role === 'page' ? ` data-lab-page="${escapeHtml(name)}"` : ''}`
            : '';
        style = `<link href="/assets/styles/${fileName}" rel="stylesheet"${devAttributes}/>`;
    }

    let script = '';
    if (options.data) {
        script += `<script id="lab-page-data" type="application/json">${serializePageData(options.data)}</script>`;
    }
    if (blocks.script) {
        const wrappedScript = `(function(){${blocks.script}\n})();`;
        const fileName = assetFileName(name, 'script', blocks.script, options.isDev);
        files.push({
            path: `assets/scripts/${fileName}`,
            contents: wrappedScript,
        });
        const devAttributes = options.isDev ? ` data-lab-script="${role}"` : '';
        script += `<script src="/assets/scripts/${fileName}"${devAttributes}></script>`;
    }

    return {
        title,
        style,
        body: blocks.body,
        script,
        files,
    };
}

export async function writePreparedFiles(files: PreparedFile[], distPath = path.resolve('dist')) {
    const transaction = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const temporaryFiles: Array<{ temporary: string; target: string }> = [];

    try {
        for (const file of files) {
            const target = path.resolve(distPath, file.path);
            const relative = path.relative(distPath, target);
            if (relative.startsWith('..') || path.isAbsolute(relative)) {
                throw new Error(`Output path escapes dist: ${file.path}`);
            }

            await fs.ensureDir(path.dirname(target));
            const temporary = `${target}.lab-${transaction}`;
            await fs.writeFile(temporary, file.contents);
            temporaryFiles.push({ temporary, target });
        }

        for (const file of temporaryFiles) {
            await fs.move(file.temporary, file.target, { overwrite: true });
        }
    } catch (error) {
        await Promise.all(temporaryFiles.map(file => fs.remove(file.temporary)));
        const message = error instanceof Error ? error.message : String(error);
        throw new LabCompilerError({
            stage: 'emit',
            file: distPath,
            message,
            detail: error instanceof Error ? error.stack : undefined,
        });
    }
}

