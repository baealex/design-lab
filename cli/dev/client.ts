interface BrowserBuildError {
    stage?: string;
    file?: string;
    line?: number;
    column?: number;
    message?: string;
}

interface BrowserConnected {
    status: 'ready' | 'building' | 'error';
    error?: BrowserBuildError;
}

interface BrowserBuildComplete {
    durationMs: number;
}

interface BrowserUpdate {
    buildId: string;
    kind: 'style' | 'page' | 'global' | 'layout' | 'partial' | 'public';
    pages: string[];
    strategy: 'patch-style' | 'reload-page' | 'reload-all';
    indexDataChanged?: boolean;
}

interface BrowserPagesData {
    pages?: unknown[];
}

interface BrowserSocket {
    on(event: 'lab:connected', callback: (payload: BrowserConnected) => void): void;
    on(event: 'lab:build-start', callback: () => void): void;
    on(event: 'lab:build-complete', callback: (payload: BrowserBuildComplete) => void): void;
    on(event: 'lab:update', callback: (payload: BrowserUpdate) => void): void;
    on(event: 'lab:error', callback: (payload: BrowserBuildError) => void): void;
    on(event: 'connect_error' | 'disconnect', callback: () => void): void;
    connect(): void;
    disconnect(): void;
}

function labClientRuntime() {
    const labWindow = window as typeof window & {
        io?: () => BrowserSocket;
        __labDev?: { socket: BrowserSocket };
    };

    if (window.self !== window.top || typeof labWindow.io !== 'function') return;

    let hideTimer = 0;
    let root: HTMLElement | null = null;
    let status: HTMLElement | null = null;
    let errorPanel: HTMLElement | null = null;

    function ensureHud() {
        if (root) return;

        const style = document.createElement('style');
        style.textContent = [
            '#__lab-hud{position:fixed;right:12px;bottom:12px;z-index:2147483647;max-width:min(460px,calc(100vw - 24px));font:600 11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;color:#e4e4e7;pointer-events:none}',
            '#__lab-status{display:inline-flex;float:right;align-items:center;gap:7px;padding:7px 10px;border:1px solid rgba(255,255,255,.14);border-radius:8px;background:rgba(24,24,27,.94);box-shadow:0 8px 30px rgba(0,0,0,.24);opacity:1;transition:opacity 160ms ease}',
            '#__lab-status[data-hidden="true"]{opacity:0}',
            '#__lab-status::before{content:"";width:6px;height:6px;border-radius:50%;background:#a1a1aa}',
            '#__lab-status[data-state="building"]::before{background:#fbbf24;animation:__lab-pulse 900ms ease-in-out infinite}',
            '#__lab-status[data-state="ready"]::before{background:#4ade80}',
            '#__lab-status[data-state="error"]::before,#__lab-status[data-state="offline"]::before{background:#fb7185}',
            '#__lab-error{clear:both;margin-top:8px;padding:12px 14px;border:1px solid rgba(251,113,133,.45);border-radius:9px;background:rgba(39,16,22,.97);box-shadow:0 12px 40px rgba(0,0,0,.3);color:#fecdd3;white-space:pre-wrap;word-break:break-word;pointer-events:auto}',
            '#__lab-error[hidden]{display:none}',
            '@keyframes __lab-pulse{50%{opacity:.35}}',
            '@media(prefers-reduced-motion:reduce){#__lab-status{transition:none}#__lab-status::before{animation:none!important}}',
        ].join('');
        document.head.appendChild(style);

        root = document.createElement('section');
        root.id = '__lab-hud';
        root.setAttribute('aria-label', 'Lab development status');

        status = document.createElement('div');
        status.id = '__lab-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');

        errorPanel = document.createElement('pre');
        errorPanel.id = '__lab-error';
        errorPanel.setAttribute('role', 'alert');
        errorPanel.tabIndex = 0;
        errorPanel.hidden = true;

        root.appendChild(status);
        root.appendChild(errorPanel);
        document.body.appendChild(root);
    }

    function showStatus(state: string, message: string, autoHide: boolean) {
        ensureHud();
        window.clearTimeout(hideTimer);
        status!.dataset.state = state;
        status!.dataset.hidden = 'false';
        status!.textContent = message;
        if (autoHide) {
            hideTimer = window.setTimeout(function() {
                status!.dataset.hidden = 'true';
            }, 900);
        }
    }

    function showError(payload: BrowserBuildError) {
        ensureHud();
        const position = payload.line
            ? ':' + payload.line + (payload.column ? ':' + payload.column : '')
            : '';
        errorPanel!.textContent = [
            String(payload.stage || 'build').toUpperCase() + ' ERROR',
            String(payload.file || '') + position,
            '',
            String(payload.message || 'Unknown build error'),
        ].join('\n');
        errorPanel!.hidden = false;
        showStatus('error', 'Build failed', false);
    }

    function clearError() {
        ensureHud();
        errorPanel!.hidden = true;
        errorPanel!.textContent = '';
    }

    function currentSlug() {
        const value = location.pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '');
        return value || 'index';
    }

    function frameSlug(frame: HTMLIFrameElement) {
        try {
            const url = new URL(frame.getAttribute('src') || '', location.href);
            return url.pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '') || 'index';
        } catch (error) {
            return '';
        }
    }

    function patchStyle(targetDocument: Document, role: string, buildId: string) {
        const link = targetDocument.querySelector('link[data-lab-style="' + role + '"]') as HTMLLinkElement | null;
        if (!link || !link.parentNode) return;

        const replacement = link.cloneNode(true) as HTMLLinkElement;
        const href = link.getAttribute('href') || '';
        const previous = link;
        replacement.href = href.split('?')[0] + '?lab=' + encodeURIComponent(buildId);
        replacement.addEventListener('load', function() {
            previous.remove();
        });
        link.parentNode.insertBefore(replacement, link.nextSibling);
    }

    function getPreviewFrame() {
        return document.getElementById('preview-iframe') as HTMLIFrameElement | null;
    }

    function refreshIndexData() {
        fetch('/__lab/pages.json?lab=' + Date.now(), { cache: 'no-store' })
            .then(function(response) {
                if (!response.ok) throw new Error('Could not refresh index data.');
                return response.json();
            })
            .then(function(data: BrowserPagesData) {
                window.dispatchEvent(new CustomEvent('lab:pages-update', {
                    detail: { pages: data.pages || [] },
                }));
            })
            .catch(function(error: unknown) {
                showError({
                    stage: 'build',
                    file: '/__lab/pages.json',
                    message: error instanceof Error ? error.message : String(error),
                });
            });
    }

    function handleStyleUpdate(payload: BrowserUpdate) {
        const slug = currentSlug();
        const frame = slug === 'index' ? getPreviewFrame() : null;

        if (payload.kind === 'global') {
            patchStyle(document, 'global', payload.buildId);
            if (frame && frame.contentDocument) patchStyle(frame.contentDocument, 'global', payload.buildId);
        }

        if (payload.pages.indexOf(slug) !== -1) {
            patchStyle(document, 'page', payload.buildId);
        }

        if (frame && payload.pages.indexOf(frameSlug(frame)) !== -1 && frame.contentDocument) {
            patchStyle(frame.contentDocument, 'page', payload.buildId);
        }
    }

    function handleUpdate(payload: BrowserUpdate) {
        if (payload.strategy === 'reload-all') {
            location.reload();
            return;
        }

        if (payload.strategy === 'patch-style') {
            handleStyleUpdate(payload);
            return;
        }

        const slug = currentSlug();
        if (slug !== 'index') {
            if (payload.pages.indexOf(slug) !== -1) location.reload();
            return;
        }

        if (payload.kind !== 'page' && payload.pages.indexOf('index') !== -1) {
            location.reload();
            return;
        }

        if (payload.pages.indexOf('index') !== -1) {
            location.reload();
            return;
        }

        if (payload.indexDataChanged) refreshIndexData();

        const frame = getPreviewFrame();
        if (frame && payload.pages.indexOf(frameSlug(frame)) !== -1 && frame.contentWindow) {
            frame.contentWindow.location.reload();
        }
    }

    ensureHud();
    showStatus('building', 'Connecting…', false);

    const socket = labWindow.io();
    labWindow.__labDev = { socket };
    socket.on('lab:connected', function(payload: BrowserConnected) {
        if (payload.status === 'error' && payload.error) {
            showError(payload.error);
            return;
        }
        showStatus(payload.status === 'building' ? 'building' : 'ready', payload.status === 'building' ? 'Building…' : 'Connected', payload.status !== 'building');
    });
    socket.on('lab:build-start', function() {
        showStatus('building', 'Building…', false);
    });
    socket.on('lab:build-complete', function(payload: BrowserBuildComplete) {
        clearError();
        showStatus('ready', 'Updated in ' + payload.durationMs + 'ms', true);
    });
    socket.on('lab:update', handleUpdate);
    socket.on('lab:error', showError);
    socket.on('connect_error', function() {
        showStatus('offline', 'Disconnected', false);
    });
    socket.on('disconnect', function() {
        showStatus('offline', 'Disconnected', false);
    });
}

export function getDevClientSource(): string {
    return `;(${labClientRuntime.toString()})();\n`;
}
