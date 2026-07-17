# Visual Effect Page Guide

## Purpose

A visual effect page demonstrates one rendering or interaction effect and makes its implementation understandable.

It is neither an established design trend nor an original interface concept. The page should show a concrete result, expose the important passes or states, and state where the implementation stops being reliable. It does not imply formal research or personal authorship of the underlying technique.

## Before You Start

Describe the result and mechanism in one sentence:

```text
A persistent height field, rebuilt normals, and angle-dependent reflection make one plane read as water.
```

Then answer:

1. What visible result does the effect produce?
2. Which model or approximation produces it?
3. Which intermediate states make the mechanism understandable?
4. What can the visitor change or inspect?
5. What are the performance, platform, and fidelity limits?

An isolated animation with no inspectable mechanism is a demo clip, not yet a documented effect page.

## Naming and Folders

Use the `effect-{year}-{slug}` format:

```text
effect-2022-reveal
effect-2022-stack
effect-2026-water-rendering
```

- Use the year when the page was first published.
- Name the visible effect or technique, not a broad visual mood.
- Use a compact Hero badge that identifies the medium or implementation context, such as `Three.js Water Effect`.
- Keep the title understandable without requiring the library name.

## Recommended Flow

### 1. Result

Show the effect immediately and describe what the visitor is looking at. Do not frame it as a new trend, original invention, or production-ready system.

### 2. Mechanism and Passes

Break the implementation into two to four observable parts. Examples include simulation state, displacement, reconstructed normals, compositing, or input handling.

Prefer diagrams, diagnostic views, and small code excerpts over generic feature cards.

### 3. Interactive Demo

Provide one complete interactive surface. Controls must change the implementation or reveal an intermediate pass; decorative controls do not belong on the page.

### 4. Limits

Document the approximation honestly. Include relevant constraints such as missing physical behavior, device support, frame cost, resolution, input limitations, and fallbacks.

## Visual and Copy Guidelines

- Let the effect remain the primary visual element.
- Keep diagnostic views visually distinct from the final output.
- Explain cause and effect: what changes, which pass changes it, and what becomes visible.
- Do not call the result photorealistic, physically accurate, or production-ready unless the page demonstrates that claim.
- Do not present the technique as a design trend, an original invention, or a reusable design system.
- Avoid filler metrics, repeated cards, and ornament unrelated to the effect.

## Interaction and Performance

- Make every visible control work and keep its state copy accurate.
- Preserve accumulated state when accumulation is part of the implementation.
- Support keyboard focus, touch input where relevant, and `prefers-reduced-motion`.
- Pause expensive work when the effect is off-screen or the document is hidden.
- Scale resolution and pixel ratio for narrow or lower-powered devices.
- Provide a readable failure state when a required browser capability is unavailable.
- Pin external runtime versions and keep page-specific code in the page bundle.

## Final Checklist

- [ ] Is the visible effect clear without explanatory copy?
- [ ] Can the implementation be understood through visible intermediate states?
- [ ] Does the interactive demo match the mechanism described in the copy?
- [ ] Do multiple interactions preserve the intended state?
- [ ] Are fidelity and performance limits explicit?
- [ ] Have mobile, keyboard, reduced-motion, and failure behavior been checked?
- [ ] Does `npm run check` pass?
