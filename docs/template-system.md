# Layouts and Partials

The project's `lab:*` syntax is not a Web Component API. It is a minimal build-time composition syntax that disappears completely after shared HTML has been assembled.

## Page

A page is a single `src/pages/{slug}/index.html` file containing its metadata, styles, body, and scripts.

```html
<!-- layout: base.html -->
<!-- title: Page title -->
<!-- description: One-line description -->

<style>
    /* Page-only styles */
</style>

<!-- lab:template -->
<body>
    <!-- Page markup -->
</body>

<script>
    // Page-only behavior
</script>
```

`layout` and `title` are required. `<!-- lab:template -->` is the compiler marker for the start of the page body. Use the marker exactly once and place an explicitly opened and closed `body` element immediately after it. The build fails if the marker is missing or duplicated, or if other content appears between the marker and `body`.

## Layout

Layouts are final document shells stored in `src/layouts`. The filename must match the value selected by the page.

```html
<!DOCTYPE html>
<html>
<head>
    <lab:slot name="title"></lab:slot>
    <lab:slot name="global-style"></lab:slot>
    <lab:slot name="style"></lab:slot>
</head>
<body>
    <lab:slot name="body"></lab:slot>
    <lab:use partial="page-tools"></lab:use>
    <lab:slot name="global-script"></lab:slot>
    <lab:slot name="script"></lab:slot>
</body>
</html>
```

The `title` and `body` slots are required. A layout cannot declare the same slot name twice.

## Slot

A slot marks where the compiler inserts content. Slots may be declared only in a layout or partial.

```html
<lab:slot name="body"></lab:slot>
```

A slot can keep fallback HTML when the compiler does not provide a value:

```html
<lab:slot name="footer">
    <footer>Design Lab by BaeJino</footer>
</lab:slot>
```

## Partial

A partial is a static HTML fragment stored at `src/partials/{name}.html`.

```html
<lab:use partial="page-tools"></lab:use>
```

Partials may include other partials. The compiler tracks nested dependencies and reports cycles as errors.

```text
Partial cycle detected: page-tools → prompt-editor → page-tools
```

Partial names may contain only letters, numbers, `_`, and `-`. Parent-directory traversal and dynamic filenames are not allowed.

## Data

Build data is not interpolated through template expressions. Pages that need data receive safely escaped JSON.

```html
<script id="lab-page-data" type="application/json">
    {"pages":[]}
</script>
```

Read the value from the page script:

```js
var element = document.getElementById('lab-page-data');
var data = JSON.parse(element.textContent || '{}');
```

## Unsupported Syntax

- Variable interpolation
- Conditionals and loops
- Filters and partial arguments
- Runtime Custom Elements
- Shadow DOM and component lifecycle hooks

Consider new syntax only when the same problem occurs in at least two real places, cannot be expressed clearly with existing slots and partials, and still allows dependencies and error locations to be determined statically.

## Build Order

```text
Discover pages
  → parse metadata and page blocks
  → compile page and global assets
  → resolve the layout
  → expand partials
  → fill slots
  → validate the final HTML
  → attach the development client (development builds only)
  → write output and hashed assets
```

Production HTML must not contain `lab:*` elements, the development client, or Socket.IO references.
