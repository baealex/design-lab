import * as builder from './modules/builder';

(async () => {
    await builder.distDirInit();
    await builder.makeGlobalAssets();

    await Promise.all(
        builder.pages.map(page => builder.makePage(page))
    );
})();
