export function useSocketClient(html: string, source: string) {
    return html.replace(
        '</body>',
        `
        <script src="/socket.io/socket.io.js"></script>
        <script>
            (function() {
                var overlay = null;
                var contentEl = null;

                function createOverlay() {
                    overlay = document.createElement('div');
                    overlay.id = '__error-overlay';
                    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:monospace;';

                    var box = document.createElement('div');
                    box.style.cssText = 'background:#1e1e1e;color:#f44;border:2px solid #f44;border-radius:8px;padding:24px 32px;max-width:80vw;max-height:80vh;overflow:auto;font-size:14px;line-height:1.6;white-space:pre-wrap;word-break:break-word;';

                    var title = document.createElement('div');
                    title.textContent = 'Build Error';
                    title.style.cssText = 'font-size:18px;font-weight:bold;margin-bottom:12px;color:#ff6b6b;';

                    contentEl = document.createElement('pre');
                    contentEl.style.cssText = 'margin:0;color:#ddd;';

                    box.appendChild(title);
                    box.appendChild(contentEl);
                    overlay.appendChild(box);
                    document.body.appendChild(overlay);
                }

                window.__showErrorOverlay = function(message) {
                    if (!overlay) createOverlay();
                    contentEl.textContent = message;
                    overlay.style.display = 'flex';
                };

                window.__hideErrorOverlay = function() {
                    if (overlay) overlay.style.display = 'none';
                };

                var socket = io();
                ${source}
            })();
        </script>
        </body>
        `
    );
}
