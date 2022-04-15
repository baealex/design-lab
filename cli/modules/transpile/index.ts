import * as fs from 'fs-extra';
import * as crypto from 'crypto';

import { scssTranspile } from './scss';
import { typescriptTranspile } from './typescript';

import { between, tagSplit } from '../text-parser';

export function createMD5(props: {
    key: string;
    text: string;
}) {
    const hash = crypto.createHmac('md5', props.key);
    return hash.update(props.text).digest('hex');
}

const INIT_OPTIONS = {
    isDev: false,
    params: undefined,
};

interface Params {
    [name: string]: unknown,
}

interface Options {
    isDev: boolean,
    params?: Params,
}

export function useTemplate(source: string) {
    return between(source, '{% extends \'', '\' %}');
}

export function getTemplateSource(name: string) {
    return fs.readFileSync(`./src/templates/${name}`).toString();
}

function injectParams(source: string, params?: Params) {
    let newSource = source;
    if (params && typeof params === 'object') {
        Object.keys(params).forEach(key => {
            newSource = newSource.replace(
                `{{ ${key} }}`,
                JSON.stringify(params[key]),
            );
        });
    }
    return newSource;
}

export function transpile(pageName: string, source: string, {
    isDev,
    params=undefined,
}: Options = INIT_OPTIONS) {
    if (useTemplate(source)) {
        return transpileWithTemplate(pageName, source, {
            isDev,
            params,
        });
    }
    return transpileWithoutTemplate(source, {
        isDev,
        params,
    });
}

function transpileWithoutTemplate(source: string, {
    isDev,
}: Options = INIT_OPTIONS) {
    let newSource = source;

    const styles = tagSplit(source, '<style>', '</style>');
    for (const style of styles) {
        const css = scssTranspile(style, { isDev });
        newSource.replace(style, css);
    }

    const scripts = tagSplit(source, '<script>', '</script>');
    for (const script of scripts) {
        const code = typescriptTranspile(script, { isDev });
        newSource = newSource.replace(script, `(function(){${code}})();`);
    }

    return newSource;
}

function transpileWithTemplate(pageName: string, source: string, {
    isDev,
    params,
}: Options = INIT_OPTIONS) {
    const template = useTemplate(source);
    const templateSource = getTemplateSource(template);

    let newSource = templateSource;
    
    const keywords = tagSplit(templateSource, '{{ ', ' }}');
    for (const keyword of keywords) {
        const key = pageName + keyword;
        const items = tagSplit(source, `<${keyword}>`, `</${keyword}>`);
        const mergeItems = [];

        for (const item of items) {
            if (keyword === 'title') {
                mergeItems.push(`<title>${item}</title>`);
            }

            else if (keyword === 'script') {
                const newScript = injectParams(item, params);
                const code = typescriptTranspile(newScript, { isDev });
                if (!isDev) {
                    const hash = createMD5({ key, text: code });
                    const fileName = `${pageName}.${hash}.js`;
                    const filePath = `./dist/assets/scripts/${fileName}`;
                    fs.writeFile(filePath, `(function(){${code}})();`);
                    mergeItems.push(`<script src="/assets/scripts/${fileName}"></script>`);
                } else {
                    mergeItems.push(`<script>(function(){${code}})();</script>`);
                }
            }

            else if (keyword === 'style') {
                const css = scssTranspile(item, { isDev });
                if (!isDev) {
                    const hash = createMD5({ key, text: css });
                    const fileName = `${pageName}.${hash}.css`;
                    const filePath = `./dist/assets/styles/${fileName}`;
                    fs.writeFile(filePath, css);
                    mergeItems.push(`<link href="/assets/styles/${fileName}" rel="stylesheet"/>`);
                } else {
                    mergeItems.push(`<style>${css}</style>`);
                }
            }

            else {
                mergeItems.push(item);
            }
        }
        newSource = newSource.replace(`{{ ${keyword} }}`, mergeItems.join(''));
    }

    return newSource;
}