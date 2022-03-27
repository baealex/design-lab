import * as builder from './modules/builder';

(async () => {
    await builder.distDirInit();
    await builder.makeIndex();
    
    for (const page of builder.pages) {
        await builder.makePage(page);
    }
})();