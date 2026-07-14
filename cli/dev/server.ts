import * as path from 'path';
import * as express from 'express';
import { Server as SocketServer } from 'socket.io';

import type { LabBuildError } from '../compiler';
import { getDevClientSource } from './client';
import {
    LAB_EVENTS,
    type LabBuildComplete,
    type LabBuildStart,
    type LabConnected,
    type LabUpdate,
    type ServerToClientEvents,
} from './protocol';

export interface DevServerOptions {
    port: number;
    distPath: string;
    getPagesData: () => unknown[];
}

export function createDevServer(options: DevServerOptions) {
    const app = express();
    let state: LabConnected = {
        buildId: 'initial',
        status: 'building',
    };

    app.get('/__lab/client.js', (_request, response) => {
        response
            .set('Cache-Control', 'no-store')
            .type('application/javascript')
            .send(getDevClientSource());
    });
    app.get('/__lab/pages.json', (_request, response) => {
        response
            .set('Cache-Control', 'no-store')
            .json({ pages: options.getPagesData() });
    });
    app.use(express.static(path.resolve(options.distPath), {
        extensions: ['html'],
        setHeaders(response) {
            response.setHeader('Cache-Control', 'no-store');
        },
    }));

    const httpServer = app.listen(options.port, () => {
        console.log(`Lab dev server: http://localhost:${options.port}`);
    });
    const sockets = new SocketServer<Record<string, never>, ServerToClientEvents>(httpServer);

    sockets.on('connection', socket => {
        socket.emit(LAB_EVENTS.connected, state);
    });

    return {
        buildStart(payload: LabBuildStart) {
            state = { buildId: payload.buildId, status: 'building' };
            sockets.emit(LAB_EVENTS.buildStart, payload);
        },
        buildComplete(payload: LabBuildComplete) {
            state = { buildId: payload.buildId, status: 'ready' };
            sockets.emit(LAB_EVENTS.buildComplete, payload);
        },
        update(payload: LabUpdate) {
            sockets.emit(LAB_EVENTS.update, payload);
        },
        error(payload: LabBuildError) {
            state = { buildId: state.buildId, status: 'error', error: payload };
            sockets.emit(LAB_EVENTS.error, payload);
        },
        close() {
            return new Promise<void>(resolve => {
                sockets.close(() => resolve());
            });
        },
    };
}
