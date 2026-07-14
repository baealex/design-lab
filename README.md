# Design Lab by BaeJino

Interactive studies of interface history, design trends, and original UI concepts.

Each study recreates or reinterprets an interface to examine what worked, what did not, and what remains useful today. Original concept studies are documented alongside historical work.

See the [page authoring guides](./docs/README.md) before adding or revising a page.

## Development

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:8888`.

## Build

```bash
npm run build
```

Run the compiler, linter, unit tests, and full production build together:

```bash
npm run check
```

Each page keeps its HTML, styles, and scripts in one file. Explicit `lab:template*` producer directives map those blocks to layout slots, either preserving style and script elements inline or emitting them as hashed assets. Shared markup is assembled from layouts and partials at build time, while the development server rebuilds and refreshes only the affected pages.
