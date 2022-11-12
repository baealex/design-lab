import { compileString } from 'sass';

export interface ScssTranspileOption {
    isDev?: boolean;
}

export function scssTranspile(source: string, options?: ScssTranspileOption) {
    try {
        const { css } = compileString(source);
        return css;
    } catch(e) {
        if (options?.isDev !== true) {
            throw e;
        }
        console.log(e);
    }
    return '';
}
