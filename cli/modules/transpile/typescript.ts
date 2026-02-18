import { minify } from 'terser';

import { reportError, clearError } from '../error-reporter';

export interface MinifyOption {
    isDev?: boolean;
}

export async function minifyScript(source: string, options?: MinifyOption) {
    try {
        if (options?.isDev) {
            clearError();
            return source;
        }

        const minified = await minify(source);
        return minified.code ?? '';
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (options?.isDev) {
            reportError(`[Script] ${message}`);
            console.log(e);
            return '';
        }
        throw e;
    }
}
