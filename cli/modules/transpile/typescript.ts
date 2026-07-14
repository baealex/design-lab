import { minify } from 'terser';

export interface MinifyOption {
    isDev?: boolean;
}

export async function minifyScript(source: string, options?: MinifyOption) {
    if (options?.isDev) {
        await minify(source, {
            compress: false,
            mangle: false,
        });
        return source;
    }

    const minified = await minify(source);
    return minified.code ?? '';
}
