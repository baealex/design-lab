import * as crypto from 'crypto';
import * as fs from 'fs-extra';

import {
    useTemplate,
    getTemplateSource,
} from './template';
import {
    tagSplit,
} from './text-parser';
import {
    scssTranspile,
    typescriptTranspile,
} from './transpile';

const INIT_OPTIONS = {
    isDev: false,
    ignoreError: false,
    params: undefined,
}

function injectParams(source: string, params: any) {
    let newSource = source;
    if (params && typeof params === 'object') {
        Object.keys(params).forEach(key => {
            newSource = newSource.replace(
                `{{ ${key} }}`,
                JSON.stringify(params[key]),
            );
        })
    }
    return newSource;
}

function transpile(pageName: string, source: string, {
    isDev,
    ignoreError,
    params,
}=INIT_OPTIONS) {
    if (useTemplate(source)) {
        return transpileWithTemplate(pageName, source, {
            isDev,
            ignoreError,
            params,
        });
    }
    return transpileWithoutTemplate(source, {
        isDev,
        ignoreError,
        params,
    })
}

function transpileWithoutTemplate(source: string, {
    ignoreError,
}=INIT_OPTIONS) {
    let newSource = source;

    const styles = tagSplit(source, '<style>', '</style>');
    for (const style of styles) {
        const css = scssTranspile(style, { ignoreError });
        newSource.replace(style, css);
    }

    const scripts = tagSplit(source, '<script>', '</script>');
    for (const script of scripts) {
        const code = typescriptTranspile(script, { ignoreError });
        newSource = newSource.replace(script, `(function(){${code}})();`);
    }

    return newSource;
}

function transpileWithTemplate(pageName: string, source: string, {
    isDev,
    ignoreError,
    params,
}=INIT_OPTIONS) {
    const template = useTemplate(source);
    const templateSource = getTemplateSource(template);

    let newSource = templateSource;
    
    const keywords = tagSplit(templateSource, '{{ ', ' }}');
    for (const keyword of keywords) {
        const items = tagSplit(source, `<${keyword}>`, `</${keyword}>`);
        const mergeItems = [];

        for (const item of items) {
            const md5Maker = crypto.createHmac('md5', pageName + keyword);

            if (keyword === 'title') {
                mergeItems.push(`<title>${item}</title>`);
            }

            else if (keyword === 'script') {
                const newScript = injectParams(item, params);
                const code = typescriptTranspile(newScript, { ignoreError });
                if (!isDev) {
                    const hash = md5Maker.update(code).digest('hex');
                    const fileName = `${pageName}.${hash}.js`;
                    const filePath = `./dist/assets/scripts/${fileName}`;
                    fs.writeFile(filePath, `(function(){${code}})();`);
                    mergeItems.push(`<script src="/assets/scripts/${fileName}"></script>`);
                } else {
                    mergeItems.push(`<script>(function(){${code}})();</script>`);
                }
            }

            else if (keyword === 'style') {
                const css = scssTranspile(item, { ignoreError });
                if (!isDev) {
                    const hash = md5Maker.update(css).digest('hex');
                    const fileName = `${pageName}.${hash}.css`;
                    const filePath = `./dist/assets/styles/${fileName}`;
                    fs.writeFile(filePath, css);
                    mergeItems.push(`<link href="/assets/styles/${fileName}" rel="stylesheet"/>`)
                } else {
                    mergeItems.push(`<style>${css}</style>`)
                }
            }

            else {
                mergeItems.push(item);
            }
        }
        newSource = newSource.replace(`{{ ${keyword} }}`, mergeItems.join(''))
    }

    return newSource;
}

module.exports = {
    transpile,
};