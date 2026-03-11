---
title: "MDGarden - Single File Wiki/inline mode"
lastModified: "2026-03-06T13:30:00+09:00"
indexing: true
---

# Single File Wiki/inline mode
`inline mode` is utilized when you want to bundle and distribute content within a single HTML file.
Maintaining multiple Markdown documents within one HTML payload conceptually mimics standard page transitions seamlessly.
Since it doesn't perform external file fetches, it runs perfectly serverless (e.g. `file://` protocol). 
This fits well with offline sharing, simple manuals, and distributable documents.

## Suitable Use Cases
- Distributing as a single file.
- Demanding browseability over `file://` locally.
- Minimizing server configurations.

If your page count is significantly high or updating is frequent, consider `include mode` as it is easier to maintain.

## Basic Structure

In inline mode, instead of `src`, you place content directly inside a `template[data-target]`.

```html
<md-garden
  id="main"
  data-inline-spa="true"
  data-inline-spa-param="page"
  data-frontmatter="true"
  data-sanitize="true"
  data-html="true">
</md-garden>

<template data-target="main">
---
title: "Home"
lastModified: "2026-03-06T12:00:00+09:00"
indexing: true
---

# Home
Welcome to inline mode.
</template>
```

## Adding Multiple Pages

When hosting multiple pages, construct additional `template[data-page]` tags.

```html
<template data-page="home.md" data-page-target="main">
# Home
[Open Guide](?page=guide.md)
</template>

<template data-page="guide.md" data-page-target="main">
# Guide
[Back to Home](?page=home.md)
</template>
```

By explicitly targeting `data-page-target`, you successfully avoid routing interference when utilizing multiple `md-garden` elements concurrently.

## Mechanism for Page Transitions

- Enable query routing with `data-inline-spa="true"`.
- Set query parameter key using `data-inline-spa-param="page"`.
- URL appropriately shifts, for instance: `?page=guide.md`.

In circumstances where you desire a fixed initial endpoint, employ `data-inline-default-page="home.md"`.

## Recommended Settings

- `data-frontmatter="true"`: Necessary when embedding metadata metrics.
- `data-sanitize="true"`: Advisable for basic security defaults.
- `data-html="true"`: Solely when mixing explicitly required HTML elements.
- `data-execute-script="false"`: Best to leave disabled.

## Security Cautions

While inline mode makes distribution frictionless, directly placing scripts inside the HTML widens your attack surface.
When integrating externally provided content, consistently strictly stick with `sanitize=true` and `execute_script=false`.

## Constraints & Trade-offs

- The consolidated file naturally balloons in size linearly with page count.
- Difficulty properly tracking change reviews compared to segmented commits.
- Readily prone to concurrent conflicts among multiple collaborators.

A simple heuristic is: "If distribution matters most, go inline. If operations matter most, go include."

## Offline Exporting originating from Author Mode

MDGarden features practical capabilities allowing operations in `include mode` and exporting the complete package functionally into an `inline mode` (Offline Wiki) utilizing Author Mode's `offline_export`.
Utilizing this robust route ensures comfortable managing processes and single HTML builds strictly solely for final distribution.

- Daily Operations: `include mode` + custom `auto_indexer`
- Output / Distribution: generate an Offline Wiki via Author mode's "Export" button.
- Output Deliverable: A comprehensive single HTML bundle routing entirely on `?page=` params (Can optionally intertwine viewer templates).
- Learn explicit details located at [Author Mode](author_mode.md).

## Next Steps

- Transition to Multi-File administration: [Multi File Wiki/include mode](include_mode.md)
- Enhancing with custom add-ons: [Plug-ins](plugins.md)
- Implementing Local Edits / Exports: [Author Mode](author_mode.md)

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
