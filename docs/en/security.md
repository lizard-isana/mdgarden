---
title: "MDGarden - Security"
lastModified: "2026-03-06T00:40:00+09:00"
indexing: true
---

# Security
Because MDGarden uses a structure to "read static files in the browser," the surface area for server compromise is small, but the security design for the content and scripts executed within the browser is crucial.  
This page is an initial draft summarizing the risks that implementers should understand first, along with configuration points acting as deterrents.

## Threat Model

First, we divide operational levels based on "who can edit the Markdown."

- Trusted editors only: Low-risk operation. You might safely enable `html`.
- Edited by an unspecified majority: High-risk operation. Establish `sanitize=true` as the foundation.
- Incorporating third-party Markdown: Maximum risk. Keep `execute_script` generally disabled.

From an attacker's perspective, the primary targets are typically threefold:

- Arbitrary script execution (XSS)
- Unintended file references (Path traversal)
- Baiting local modifications to exploit the Local Editor save operations

## Trust Boundaries

MDGarden's boundaries largely comprise three layers.

- Inside the browser: The layer where rendering and plugin execution take place.
- Local files: `file://`, File System Access API, compilation/download paths.
- Public server: Exclusively for serving static files (usually un-writable).

It's vital to note that `data-author` and UI presentations indicate "display state" rather than acting as a "permissions manager."  
Security boundaries must be crafted via browser authorities, delivery configurations, and rules for content operation.

## Markdown/HTML Rendering Risks

Permitting HTML within Markdown expands the exposure to XSS in exchange for expressiveness.  
The following inputs are particularly hazardous:

- `script` tags and event attributes (e.g., `onclick`)
- Links containing the `javascript:` scheme
- External script/style inclusions

If operating with `sanitize=false`, strictly limit the editors to an environment where review is enforced.

## Secure Configuration Trade-offs

- `sanitize=true`: Safe-leaning. Assume this as the standard.
- `html=false`: Inhibits HTML embedding. Safer still.
- `execute_script=false`: The most pivotal security command to maintain.

Recommended Initial Strategy:

1. Guarantee `sanitize=true` alongside `execute_script=false` in production.
2. Separate operation routines exclusively for pages requiring scripts under exceptional circumstances.
3. Upon modification, heavily focus the differential review toward `<script>` arrays and event characteristics.

## Include Mode Path Controls

For include mode, link resolution configurations directly correlate with safety.

- `allowed_dirs` / `allowed_files`: Miminize the permissible access scope.
- `strict_root=true`: Reduce vague references outside the root directory.
- Consider utilizing `allow_parent=false` as a standard practice.
- Restrict unpredicted paths dynamically by integrating `query_path_mode` with the URL design.

Architecting by identifying what "cannot be shown" before what "can be shown" bears effectiveness.

## Precautions for Author Mode and Local Editor

While Author Mode can reduce accidental operations in a public domain through `localhost` bounds, it does not supply impenetrable defense.  
Possibilities linger wherein other scripts operating within the same page commandeer the save operation flow.

Fully abide by the following for the Local Editor:

- Save commands consistently actuate from a user's prompt (e.g., a click).
- Establish an operation method confirming the target directory on every save.
- Suppress loading unnecessary external scripts across the same page.

The matters of "inability to rewrite the server" and "absence of localized modification vulnerabilities" are two distinct issues.

## Offline Export Risks

Although Offline Wiki output guarantees powerful distribution proficiency, it requires attention locally.

- Should external asset dependencies persist, absolute reproduction in offline statuses cannot be ensured.
- Catching modifications post-distribution is complicated.
- Noteworthy architectural divergence among browsers exists executing under `file://`.

At minimum, we recommend annotating the generated timestamp, root composition commit, and acquainted limitations amidst the distributables.

## Plugin and Supply Chain

Plugins revolve at the center of functional expansions, simultaneously widening the authority of execution permissions.

- Evade the installation of plugins of enigmatic origins.
- Lock to a fixed version for dependencies, ratifying variance logs during modifications.
- Pin plugin load order priorities ensuring reproducibility of behavior routines.

Strictly limit to trusted sources especially when utilizing alongside `execute_script`.

## Handling of IndexedDB Data

IndexedDB is not a vault that guarantees resistance to tampering.  
We treat `runtimeOverride` caches and sitemap registers uniquely as "local conditions meant for utility usability."

Operation necessities:

- Prepare a systematization allowing restoration upon breakage sequences.
- Store original duplicates representing permanent data toward Git / equivalent repositories beforehand.
- Document mechanisms for resuscitating processes upon expunging browser storage elements.

## Recommended Safeguards During Production Operation

- Integrate CSP (Content Security Policy) deployments.
- Employ SRI verifications over any externally driven scripts.
- Regulate editing authority to the maximum marginal threshold.
- Strongly probe Front Matter elements, script embeddings, and link sequences throughout screening measures preceding publication.
- Implant version matrices within end distributions (like Offline Wiki formats).

## Pre-Publication Security Checklist

- Evaluated the fundamental intentions underlying configurations for `sanitize` and `execute_script`.
- Sifted across anomalous elements addressing external `src`, unrecorded links, and unnoted external script integrations.
- Concluded `allowed_dirs` or `allowed_files` scopes absent of extravagant breadth.
- Ensured Author Mode hasn't been improperly instantiated spanning domains under the pubic operation web paths.
- Verified sequences and limitations associated with Offline Exports operation execution sets.
- Logged synchronization mapping traces correlating outputs toward root instances (via referencing commit IDs for instance).

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
