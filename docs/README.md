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

Place the page body immediately after the compiler marker:

```html
<!-- lab:template -->
<body>
    <!-- Page markup -->
</body>
```

Public page copy and project documentation are written in English. Keep new work in English unless the subject itself requires another language.

Run `npm run build` when the page is ready. Use `npm run check` to run the compiler, linter, unit tests, and full page build together.
