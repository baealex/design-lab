import { renderSync } from 'node-sass';

export interface ScssTranspileOption {
    isDev?: boolean;
}

export function scssTranspile(source: string, options?: ScssTranspileOption) {
    try {
        const { css } = renderSync({
            data: source,
            outputStyle: 'compressed',
        });
        return css.toString();
    } catch(e) {
        if (options?.isDev !== true) {
            throw e;
        }
        console.log(e);
    }
    return '';
}