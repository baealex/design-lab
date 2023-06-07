import { Server as SocketServer } from 'socket.io';

import * as builder from './modules/builder';
import { clientManager } from './modules/client-manager';
import { useDebounce, useHttpServer } from './modules/hooks';

new SocketServer(useHttpServer(8888)).on('connection', (socket) => {
    clientManager.push({
        id: socket.id,
        onChange: (path) => socket.emit('onchange', path),
    });

    socket.on('disconnect', () => {
        clientManager.remove(socket.id);
    });
});

(async () => {
    await builder.distDirInit();

    const debounceEvent = useDebounce<string>((value = '') => {
        clientManager.run(value);
    }, 1000);

    await builder.watchSrc(builder.SOURCE_PATH, (path) => {
        debounceEvent(path);
    });

    for (const page of builder.pages) {
        await builder.makePage(page, { isDev: true });
    }
})();
