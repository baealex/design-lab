const dister = require('./dister');

(async () => {
    await dister.init();

    for (const page of (await dister.getPages())) {
        dister.compile(page);
    }
})()