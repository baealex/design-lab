# Concept Page Guide

## Purpose

A concept page does not explain an established trend. It tests an original visual hypothesis or interface idea and shows where that idea remains useful.

A clear idea matters more than the appearance of novelty.

## Before You Start

Describe the concept in one sentence:

```text
Sketchomorphism mixes hand-drawn traces into polished AI interfaces to make human involvement visible.
```

Then answer these questions:

1. What feeling or problem prompted the concept?
2. What rules make it distinct?
3. How does it work in an actual interface?
4. Where does it fit, and where does it not?
5. Which designs influenced it, if any?

A color palette or effect without a rule is not yet ready to become a page.

## Naming and Folders

Use the `concept-{year}-{slug}` format:

```text
concept-2022-neon-glow
concept-2025-monochrome
concept-2026-sketchomorphism
```

- Use the year when the concept was first published or documented.
- Avoid names that could be mistaken for an established trend.
- Start every Hero with a compact badge above the concept name. The badge is a shared signature across the catalog, not optional decoration.
- Use the badge to show the most useful origin or context: `Inspired by ...`, `Used in ...`, or a concrete label such as `One-Hue Interface Study`.
- Avoid generic category labels such as `Original Concept`, `Concept Study`, or `Personal System` when the page can say something specific.
- Keep an `Inspired by ...` credit short and name only the strongest influence.

## Recommended Flow

### 1. Premise

Show the concept name and hypothesis in the Hero. Do not present it as a prediction or an established trend.

Place the top edge of `.hero-badge` `96px` below the viewport top on both desktop and mobile. The usual structure is `32px` of page-container padding followed by `64px` of Hero padding; custom Heroes should preserve the same rendered start line.

### 2. Rules

Define two to four rules that create the concept. Prefer rules that can be observed on screen over impressions such as `beautiful`, `futuristic`, or `emotional`.

Examples:

- Every line has a slightly different curvature.
- Glow intensity communicates information priority.
- The interface is monochrome, while color is reserved for content.

### 3. Working Example

Use one complete example to prove that the rules work in a real interface. A well-made small app or screen is more useful than several decorative cards.

### 4. Limits

Describe both suitable and unsuitable contexts. Do not present the concept as if it has no drawbacks.

## Visual Guidelines

- The core hypothesis should be visible at a glance.
- Every decorative choice should be explainable through the concept's rules.
- Do not default to unrelated glass cards, aurora backgrounds, or neon effects.
- Each principle does not need the same card layout. Choose the structure that demonstrates the concept best.
- Avoid fake charts, meaningless metrics, and filler icons.
- Show how the reference was transformed instead of simply reproducing it.

## Copy Guidelines

- Use language such as `This concept explores ...` to make the hypothetical nature clear.
- Avoid claims such as `the future of UI` or `changes everything` without evidence.
- Explain rules and outcomes instead of repeating the same adjectives.
- Include `What This Is Not` or a Manifesto only when it adds substance, not to fill a template.
- Keep the boundary between original work and referenced work visible.

## Interaction and Performance

- Interactions should demonstrate the concept's rules. Reduce movement that exists only as decoration.
- When state changes, both the interface and its copy must remain accurate.
- Provide an alternative for interactions unavailable on touch devices, or state the limitation.
- Support visible keyboard focus and `prefers-reduced-motion`.
- Avoid full-screen filters and excessive blur. Process pointer events at most once per frame.
- Confirm that the key example remains present on mobile.

## Final Checklist

- [ ] Can the concept be explained in one sentence?
- [ ] Are at least two visual rules clear?
- [ ] Is there one complete usage example?
- [ ] Are suitable and unsuitable contexts documented?
- [ ] Are original and referenced ideas distinguishable?
- [ ] Have meaningless cards, metrics, and decorations been removed?
- [ ] Have mobile, keyboard, and reduced-motion behavior been checked?
- [ ] Does `npm run build` pass?
