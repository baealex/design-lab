# Templates, Layouts, and Partials

The project's `lab:*` syntax is a build-time composition contract, not a Web Component API. Page directives declare what a source block supplies, and Layout slots declare where the compiled result is consumed. All Lab syntax disappears from production output.

## Page

A Page is a single `src/pages/{slug}/index.html` file containing metadata and explicitly declared template blocks.

```html
<!-- layout: base.html -->
<!-- title: Page title -->
<!-- description: One-line description -->

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

`layout` and `title` are required. The body block is also required; style and script blocks are optional.

## Producer Directives

A producer directive owns the explicit HTML element immediately following it. The element name selects the matching Layout slot, and the directive mode selects how its contents are prepared.

| Page source | Compiler result | Layout destination |
| --- | --- | --- |
| `lab:template:bundle` + `style` | Emit a page CSS asset and create its `<link>` | `lab:slot name="style"` |
| `lab:template` + `body` | Extract the body markup | `lab:slot name="body"` |
| `lab:template:bundle` + `script` | Process and emit a page JavaScript asset, then create its `<script src>` | `lab:slot name="script"` |

Production assets include a content hash. Development assets keep stable names so the socket client can patch or reload the affected Page.

These directives are compiler instructions, not optional labels:

- A directive must be followed immediately by its element, with only whitespace between them.
- `style` and `script` must use `lab:template:bundle`.
- `body` must use `lab:template`.
- Each block type may appear at most once.
- Block wrappers must have explicit closing tags and cannot have attributes because the compiler consumes the wrappers.
- An unmarked top-level `style`, `body`, or `script` block fails the build.
- A producer directive cannot be nested inside another Page block.

The final document receives the generated asset reference or inner markup, never the source directive or its compile-time wrapper.

## Layout

A Layout is a final document shell stored in `src/layouts`. Its filename must match the Page's `layout` metadata.

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

The `title` and `body` slots are required. A Layout cannot declare the same slot name twice. If a Page or the global asset pipeline supplies non-empty content for a slot the Layout does not declare, composition fails instead of silently dropping it.

## Slot

A slot is the consumer side of the template contract. Slots may be declared only in a Layout or Partial.

```html
<lab:slot name="body"></lab:slot>
```

A slot can keep fallback HTML when the compiler does not supply a value:

```html
<lab:slot name="footer">
    <footer>Design Lab by BaeJino</footer>
</lab:slot>
```

Page metadata supplies `title`. The global pipeline supplies `global-style` and `global-script`. Page producer directives supply `style`, `body`, and `script`.

## Partial

A Partial is a static HTML fragment stored at `src/partials/{name}.html`.

```html
<lab:use partial="page-tools"></lab:use>
```

Partials may include other Partials. The compiler tracks nested dependencies and reports cycles as errors.

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

Read the value from the Page script:

```js
var element = document.getElementById('lab-page-data');
var data = JSON.parse(element.textContent || '{}');
```

## Unsupported Syntax

- Variable interpolation
- Conditionals and loops
- Filters and Partial arguments
- Unbundled top-level Page style or script blocks
- Runtime Custom Elements
- Shadow DOM and component lifecycle hooks

Consider new syntax only when the same problem occurs in at least two real places, cannot be expressed clearly with existing producers, slots, and Partials, and still allows dependencies and error locations to be determined statically.

## Build Order

```text
Discover Pages
  → parse metadata and producer directives
  → map each declared block to its slot
  → process Page and global bundles
  → resolve the Layout
  → expand Partials
  → fill slots
  → validate the final HTML
  → attach the development client (development builds only)
  → write output and hashed assets
```

Production HTML must not contain `lab:*` elements, `lab:template*` comments, the development client, or Socket.IO references.
