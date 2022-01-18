const dister = require('./dister');

(async () => {
    await dister.init();

    for (const path of (await dister.getPaths())) {
        dister.compile(path);
    }
})()