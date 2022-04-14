import * as express from 'express';
import { Server } from 'socket.io';
import * as path from 'path';

import * as builder from './modules/builder';
import {
    useDebounceEvent,
} from './modules/hooks/use-event';

interface ChangeHandlerItem {
    id: string;
    onChange: (path: string) => void;
}

const changeHandler = (() => {
    let items: ChangeHandlerItem[] = [];

    return {
        run(path: string) {
            items.forEach(item => item.onChange(path));
        },
        push(item: ChangeHandlerItem) {
            items.push(item);
        },
        remove(id: string) {
            items = items.filter(item => item.id !== id);
        }
    };
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
    });

    socket.on('disconnect', () => {
        changeHandler.remove(socket.id);
    });
});

(async () => {
    await builder.distDirInit();

    for (const page of builder.pages) {
        const debounceEvent = useDebounceEvent<string>((value) => {
            changeHandler.run(value || '');
        }, 1000);

        await builder.makePage(page, { isDev: true });
        await builder.watchPage(page, (path) => {
            debounceEvent(path);
        });
    }
})();