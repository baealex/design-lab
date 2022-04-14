import * as builder from './modules/builder';

(async () => {
    await builder.distDirInit();
    
    for (const page of builder.pages) {
        await builder.makePage(page);
    }
})();