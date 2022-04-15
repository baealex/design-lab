export function useClientSocket(html: string, source: string) {
    return html.replace(
        '</body>',
        `
        <script src="/socket.io/socket.io.js"></script>
        <script>
            var socket = io();
            ${source}
        </script>
        </body>
        `
    );
}