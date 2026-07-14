# Page Authoring Guide

- [Design trend pages](./design-trend.md)
- [Concept pages](./concept.md)
- [Layouts and partials](./template-system.md)
- [Development server](./dev-server.md)

Both page types live in a single HTML file under `src/pages`. Keep page-specific styles and scripts in that file as well.

Add the following metadata at the top of the file:

```html
<!-- layout: base.html -->
<!-- title: Page title -->
<!-- description: One sentence shown in the index -->
```

Declare each Page block immediately after its compiler directive:

```html
<!-- lab:template:bundle -->
<style>
    /* Page CSS */
</style>

<!-- lab:template -->
<body>
    <!-- Page markup -->
</body>

<!-- lab:template:bundle -->
<script>
    // Page JavaScript
</script>
```

The next tag selects the matching Layout slot. `body` is inserted as markup, while `style` and `script` are bundled into hashed assets before their generated references are inserted. The body block is required; style and script blocks are optional. Unmarked blocks and incorrect directive modes fail the build.

Public page copy and project documentation are written in English. Keep new work in English unless the subject itself requires another language.

Run `npm run build` when the page is ready. Use `npm run check` to run the compiler, linter, unit tests, and full page build together.
