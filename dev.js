const express = require('express');
const path = require('path');

const dister = require('./dister');
const port = 3000;

(async () => {
    await dister.init();

    for (const page of (await dister.getPages())) {
        dister.compile(page);
        dister.watch(page);
    }

    express()
        .use(express.static(path.resolve('dist'), {
            extensions: ['html']
        }))
        .listen(port, () => console.log(`listen on :${port}`));
})()