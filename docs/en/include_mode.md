---
title: "MDGarden - Multi File Wiki/include mode"
lastModified: "2026-03-06T09:00:00+09:00"
indexing: true
---

# Multi File Wiki/include mode
`include mode` is the standard approach to manage your Markdown when separating it over multiple distinctive files.
For projects exhibiting frequent revisions or scaling volumes, this mode boasts substantially superior maintainability compared to `inline mode`.

## Suitable Use Cases

- Progressively updating massive pools of documents iteratively.
- Tracking definitive delta adjustments on a granular, per-page Git scale.
- Completely severing overarching structural layout from textual body data.

Prioritize inline mode when distributability supersedes, yet strictly adhere to include mode whenever operational sustainability is a necessity.

## Directory Tree Example

Minimal Setup:

Example of directly publishing index.md alongside subpage.md
```text
docs/
  index.html
  config.json
  index.md
  subpage.md
  assets/
    css/default.css
    js/mdgarden.min.js
```

You can compartmentalize your data inside subdirectories like `content/` relying upon the `data-allowed-dirs` parameter constraints explicitly defining legal access parameters.

```text
docs/
  index.html
  config.json
  index.md
  content/
    subpage.md
  assets/
    css/default.css
    js/mdgarden.min.js
```


## Basic Settings

Inside `index.html`:

```html
<md-garden
  id="main"
  src="index.md"
  data-link-target="main"
  data-strict_root="true"
  data-allowed-dirs="content,dev"
  data-allowed-files="index.md,404.md"
  data-link-resolution="relative"
  data-allow-parent="true"
  data-query-path-mode="split">
</md-garden>
```

Key Variables:

- `src`: Your initial, default-loaded Markdown entry.
- `allowed_dirs`: Legal read directory targets. Files housed outside of listed parameters are restricted explicitly.
  - This simply obscures access over traversing MDGarden; this isn't genuine web server-side request blockage rules.
- `strict_root`: Defines rules enforcing rigorous root directory parsing dependencies.
  - Asserting `true` immediately locks references singularly to listings precisely inside `allowed_files`.
- `allowed_files`: When invoking `strict_root`=true, explicitly allowed fetch paths.
- `link_resolution`: Structural tracking policies favoring either `relative` anchors or rigid `root` references.
- `allow_parent`: Enabling traversal rules targeting relative parent mapping sequences: `..`.
- `query_path_mode`: Dictates trailing syntax patterns formatting target URL rendering: `full` or `split`.

## Deciphering Links and URL Structuring Concepts

Traversal through `include mode` structurally binds fully atop query parameters dynamically assigning navigation routes.

### query_path_mode
- `full`: Displays exact path `?main=path/to/page.md`
- `split`: Displays layered path `?main=page.md&dir=path&subdir=to`

In cases harboring labyrinthine directories, default reliably upon `full` at initial implementation phases, shifting gracefully into `split` logic purely conditionally upon requisite needs arising explicitly.

### link_resolution
- `root`: Absolute ignoring current documentation hierarchy positioning natively preferring global document roots constantly.
- `relative`: Strictly parsing endpoints logically aligned atop positional paths corresponding physically against current executing Markdown files directly.


## Synthesizing Hybrid Layout Structures

Establishing independent `header` or structurally parallel `footer` `<md-garden>` entities individually builds out elegant multi-tiered layouts functionally matching sophisticated CMS systems immediately.
When employing multifaceted layered designs, emphatically correlate precisely corresponding `id` tags aligned beside matching `data-link-target` attributes, cementing definitively strictly which singular viewer retains priority oversight executing page navigations exclusively.

## Common Errors and Workarounds

- `Blocked target path`  
  Check your `allowed_dirs`, `allowed_files`, and `allow_parent` properties.
- `Not Found`  
  Check `src`, the actual file placement, and `.md` extensions.
- Unintended pages opening  
  Check the combination of `link_resolution` and `query_path_mode`.
- Transition URLs are long / confusing
  Reconsider your choice between the `split` and `full` methods.

## Using along with inline mode

- include mode: Strong for operation, updating, and split management.
- inline mode: Strong for distribution, portability, and standalone sharing.

Managing the project via include mode initially, and relying on the Offline Wiki (inline) export functionality during your distribution phase is an ideal structure to work with.

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
