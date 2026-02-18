import * as builder from './modules/builder';

(async () => {
    await builder.distDirInit();

    await Promise.all(
        builder.pages.map(page => builder.makePage(page))
    );
})();
