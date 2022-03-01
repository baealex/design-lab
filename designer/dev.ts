import * as express from 'express';
import { Server } from 'socket.io';
import * as path from 'path';

import * as builder from './modules/builder';

interface ChangeHandlerItems {
    id: string;
    onChange: (path: string) => void;
}

const changeHandler = (() => {
    let items: ChangeHandlerItems[] = [];

    return {
        run(path: string) {
            items.forEach(item => item.onChange(path))
        },
        push: items.push,
        remove(id: string) {
            items = items.filter(item => item.id !== id)
        }
    }
})();

const PORT = 3000;

const app = express()
    .use(express.static(path.resolve('dist'), {
        extensions: ['html']
    }))
    .listen(PORT, () => console.log(`listen on :${PORT}`));

const io = new Server(app);

io.on('connection', (socket) => {
    changeHandler.push({
        id: socket.id,
        onChange: (path) => socket.emit('onchange', path),
    })

    socket.on('disconnect', () => {
        changeHandler.remove(socket.id);
    })
});

(async () => {
    await builder.distDirInit();
    await builder.makeIndex({ isDev: true });
    await builder.watchIndex();

    for (const page of builder.pages) {
        await builder.makePage(page, { isDev: true });
        await builder.watchPage(page, (path) => {
            changeHandler.run(path);
        });
    }
})()