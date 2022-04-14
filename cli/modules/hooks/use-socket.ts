export function useSocket(target: string, source: string) {
    return target.replace(
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