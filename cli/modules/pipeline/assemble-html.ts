import * as fs from 'fs-extra';

import type { EmittedAssets } from './emit-assets';

export interface GlobalAssets {
    style: string;
    script: string;
}

export function readLayout(name: string): string {
    return fs.readFileSync(`./src/templates/${name}`).toString();
}

export function assembleHtml(layoutName: string, assets: EmittedAssets, globalAssets: GlobalAssets): string {
    const layout = readLayout(layoutName);

    return layout
        .replace('<!-- slot: title -->', assets.title)
        .replace('<!-- slot: global-style -->', globalAssets.style)
        .replace('<!-- slot: style -->', assets.style)
        .replace('<!-- slot: body -->', assets.body)
        .replace('<!-- slot: global-script -->', globalAssets.script)
        .replace('<!-- slot: script -->', assets.script);
}
