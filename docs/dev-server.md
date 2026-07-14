# Development Server

```bash
npm run dev
```

The default address is `http://localhost:8888`.

The development runtime separates the Compiler, Watcher, Server, Protocol, and Client responsibilities. Instead of mapping every file path to a full rebuild, the Watcher asks the compiler's dependency graph which pages are affected.

## Update Behavior

| Change | Build scope | Browser behavior |
| --- | --- | --- |
| Bundled Page style | Affected page | Replace the stylesheet |
| Inline Page style | Affected page | Reload the affected page |
| Page body or script | Affected page and index data | Reload the affected page only |
| Partial | Dependent pages | Reload affected pages only |
| Layout | Dependent pages | Reload affected pages only |
| Global style | Global style | Replace the stylesheet in every open page |
| Global script | Global script | Reload all pages |
| Public asset | Affected asset | Reload all pages |

When a page shown in the index preview changes, the index itself stays in place. The server replaces the iframe stylesheet or reloads only that iframe. When page metadata changes, the index reloads `/__lab/pages.json` and updates its list.

## Development-only Paths

```text
/__lab/client.js
/__lab/pages.json
/socket.io/socket.io.js
```

The development client is served as a separate asset instead of being copied inline into every HTML document. These paths are not included in production output.

## Socket Protocol

```text
lab:connected
lab:build-start
lab:build-complete
lab:update
lab:error
```

`lab:update` describes the type of change, affected pages, and update strategy.

```ts
interface LabUpdate {
    buildId: string;
    kind: 'style' | 'page' | 'global' | 'layout' | 'partial' | 'public';
    pages: string[];
    strategy: 'patch-style' | 'reload-page' | 'reload-all';
    indexDataChanged?: boolean;
}
```

Rapid file changes are grouped into build transactions and processed in order. If compilation or composition fails, the server neither writes partial output nor emits a reload event, so the last successful page remains visible. The status control in the lower-right corner of the browser reports the failed stage and file location.
