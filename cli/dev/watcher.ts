import { watch, type FSWatcher } from 'chokidar';

export type SourceEvent = 'add' | 'change' | 'unlink';

export interface SourceChange {
    event: SourceEvent;
    file: string;
}

export class LabWatcher {
    private readonly pending = new Map<string, SourceChange>();
    private timer?: NodeJS.Timeout;
    private running = false;
    private watcher?: FSWatcher;

    constructor(
        private readonly paths: string[],
        private readonly onBatch: (changes: SourceChange[]) => Promise<void>,
    ) {}

    start() {
        this.watcher = watch(this.paths, {
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 50,
            },
        });
        this.watcher.on('all', (event, file) => {
            if (event !== 'add' && event !== 'change' && event !== 'unlink') return;
            this.pending.set(file, { event, file });
            if (this.timer) clearTimeout(this.timer);
            this.timer = setTimeout(() => void this.drain(), 80);
        });
        return this;
    }

    private async drain() {
        if (this.running || this.pending.size === 0) return;
        this.running = true;

        try {
            while (this.pending.size > 0) {
                const changes = Array.from(this.pending.values());
                this.pending.clear();
                await this.onBatch(changes);
            }
        } finally {
            this.running = false;
        }
    }

    async close() {
        if (this.timer) clearTimeout(this.timer);
        await this.watcher?.close();
    }
}

