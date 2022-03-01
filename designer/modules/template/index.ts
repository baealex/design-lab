import * as fs from 'fs-extra';

import { between } from '../text-parser';

export function useTemplate(source: string) {
    return between(source, `{% extends '`, `' %}`);
}

export function getTemplateSource(name: string) {
    return fs.readFileSync(`./src/templates/${name}`).toString();
}