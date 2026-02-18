import { compileString } from 'sass';

import { reportError, clearError } from '../error-reporter';

export interface ScssTranspileOption {
    isDev?: boolean;
}

export function scssTranspile(source: string, options?: ScssTranspileOption) {
    try {
        const { css } = compileString(source);
        if (options?.isDev) {
            clearError();
        }
        return css;
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (options?.isDev) {
            reportError(`[SCSS] ${message}`);
            console.log(e);
            return '';
        }
        throw e;
    }
}
