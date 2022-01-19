const express = require('express');
const socketio = require('socket.io');
const path = require('path');

const builder = require('./builder');
const port = 3000;

const app = express()
    .use(express.static(path.resolve('dist'), {
        extensions: ['html']
    }))
    .listen(port, () => console.log(`listen on :${port}`));

let handleChnages = [];

const io = new socketio.Server(app);
io.on('connection', (socket) => {
    handleChnages.push({
        id: socket.id,
        onChange: (path) => socket.emit('onchange', path),
    })

    socket.on('disconnect', () => {
        handleChnages = handleChnages.filter(({ id }) => id !== socket.id)
    })
});

(async () => {
    await builder.distDirInit();
    await builder.makeIndex({ isDev: true });
    await builder.watchIndex();

    for (const page of builder.pages) {
        await builder.makePage(page, { isDev: true });
        await builder.watchPage(page, (path) => {
            handleChnages.forEach(({ onChange }) => onChange(path))
        });
    }
})()