const express = require('express');
const path = require('path');

const builder = require('./builder');
const port = 3000;

(async () => {
    await builder.distDirInit();
    await builder.makeIndex({ ignoreError: true });
    await builder.watchIndex();
    await builder.makePages({ ignoreError: true });
    await builder.watchPages();

    express()
        .use(express.static(path.resolve('dist'), {
            extensions: ['html']
        }))
        .listen(port, () => console.log(`listen on :${port}`));
})()