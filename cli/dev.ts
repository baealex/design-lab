import { Server } from 'socket.io';

import * as builder from './modules/builder';
import { useDebounceEvent, useServer } from './modules/hooks';

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

const io = new Server(useServer(3000));

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