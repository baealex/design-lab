import { Server as SocketServer } from 'socket.io';

import * as builder from './modules/builder';
import { clientManager } from './modules/client-manager';
import { setErrorHandler } from './modules/error-reporter';
import { useDebounce, useHttpServer } from './modules/hooks';

new SocketServer(useHttpServer(8888)).on('connection', (socket) => {
    clientManager.push({
        id: socket.id,
        onChange: (path) => socket.emit('onchange', path),
        onError: (message) => socket.emit('onerror', message),
    });

    socket.on('disconnect', () => {
        clientManager.remove(socket.id);
    });
});

setErrorHandler((error) => {
    clientManager.error(error);
});

(async () => {
    await builder.distDirInit();

    const debounceEvent = useDebounce<string>((value = '') => {
        clientManager.run(value);
    }, 1000);

    builder.watchSrc(debounceEvent);

    await Promise.all(
        builder.pages.map(page => builder.makePage(page, { isDev: true }))
    );
})();
