# Design Trend Page Guide

## Purpose

A design trend page should do more than reproduce an old interface.

Use one page to show what the design originally solved, which ideas still hold up, and which problems should be improved. Preserve the character of the period without carrying its usability problems into the whole page.

## Before You Start

Answer these questions first:

1. What is the design's correct name and time period?
2. What problem did it solve at the time?
3. Which principles are still useful?
4. What problems became clear over time?
5. What would need to change in a modern implementation?

Do not start with the screen if the answers are still vague.

## Naming and Folders

Use the `design-{year}-{slug}` format:

```text
design-1984-macintosh
design-2001-luna
design-2013-flat
```

- Use the actual name, such as `Macintosh` or `Luna`, when the page studies the visual language of an operating system or product.
- Use an established trend name, such as `Flat Design` or `Skeuomorphism`, when the page covers a broader movement.
- Do not present one product example as the name of an entire trend.
- Use the most representative year of emergence. Explain disputed dates in the page copy.

## Recommended Flow

The visual layout can vary, but the content should generally follow this order.

### 1. Hero

- Name and year
- One sentence that frames the entire page
- A short `Inspired by ...` credit when a specific product is the visual reference

### 2. Context

Explain why the design was needed, not only what became popular. Briefly cover the relevant change in technology, usage environment, or limitation of the previous interface.

### 3. Principles

Break the design into two to four core principles. Pair each principle with an example that can be operated or compared.

Good examples:

- Open a menu to reveal the information hierarchy.
- Compare a button across its interaction states.
- Apply the old and improved approaches to the same content side by side.

Avoid:

- Meaningless metrics and progress bars
- Decorative buttons that do nothing
- Repeating the same card with different filler copy

### 4. Keep / Improve

End by stating what should be kept and what should be improved. Do not stop at nostalgia or criticism.

## Visual Guidelines

- Select clues that explain the period, such as color, typography, borders, shadows, and icons.
- The whole page does not need to imitate an operating system. Persistent elements such as taskbars and menu bars should appear only when they are necessary to the lesson.
- Reproduce historical weaknesses inside a small demo. Keep the page itself readable and operable by current standards.
- Reduce backgrounds and decoration when they attract attention before the content.
- Do not add unrelated glass cards, gradients, or fake dashboards by habit.

## Copy Guidelines

- Avoid repeatedly using exaggerated words such as `legendary`, `radical`, and `finally`.
- Explain what problem the design solved and how instead of simply declaring it good.
- Describe drawbacks as specific usability problems, not merely as dated or inconvenient.
- Verify names, years, and historical claims. Do not state uncertain details as facts.
- Do not repeat the same point in the Hero, Context, and Manifesto.

## Interaction and Performance

- Anything that looks like a button must work.
- Keyboard focus must be visible, and essential controls must work with a keyboard.
- Demos must not be clipped or overflow horizontally on mobile.
- Support `prefers-reduced-motion`.
- Avoid large blurs, full-screen filters, and layout measurements on every frame.
- Use animation primarily to explain state changes, not as decoration.

## Final Checklist

- [ ] Are the name and year appropriate?
- [ ] Is a specific product clearly distinguished from a broader trend?
- [ ] Does the page explain the problem the design originally solved?
- [ ] Are the ideas to keep separated from the problems to improve?
- [ ] Do the demos demonstrate the stated principles?
- [ ] Have decorative cards and repeated copy been reduced?
- [ ] Have mobile, keyboard, and reduced-motion behavior been checked?
- [ ] Does `npm run build` pass?
