# Page Authoring Guide

- [Design trend pages](./design-trend.md)
- [Concept pages](./concept.md)
- [Visual effect pages](./effect.md)
- [Layouts and partials](./template-system.md)
- [Development server](./dev-server.md)

All three page types live in a single HTML file under `src/pages`. Keep page-specific styles and scripts in that file as well.

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

The next tag selects the matching Layout slot. `lab:template` preserves a style or script element inline, while `lab:template:bundle` replaces its contents with a hashed asset reference. The body block always uses `lab:template` and supplies its inner markup. Body is required; style and script are optional, and each block type may appear at most once. Unmarked blocks and invalid directive modes fail the build.

Public page copy and project documentation are written in English. Keep new work in English unless the subject itself requires another language.

Run `npm run build` when the page is ready. Use `npm run check` to run the compiler, linter, unit tests, and full page build together.
