const builder = require('./builder');

(async () => {
    await builder.distDirInit();
    await builder.makeIndex();
    await builder.makePages();
})()