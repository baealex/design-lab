import * as express from 'express';
import * as path from 'path';

export function useServer(port: number) {
    return express()
        .use(express.static(path.resolve('dist'), {
            extensions: ['html']
        }))
        .listen(port, () => console.log(`listen on :${port}`));
}