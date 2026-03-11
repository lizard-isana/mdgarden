---
title: "MDGarden - Jorro"
lastModified: "2026-03-09T02:00:00+09:00"
indexing: true
---

# MDGarden + Jorro
Jorro is a minimalist Web server designed explicitly for localhost use, engineered with the intention of being run alongside MDGarden.  
It listens solely on `127.0.0.1` and treats the directory containing the executable as its document root.

## Download
- https://github.com/lizard-isana/jorro/releases/

## Feature Overview (Summary)

- Host destination limited strictly to `127.0.0.1` (assuming non-public exposure).
- Distributes files recognizing the directory holding the executable as its primary document root.
- Designed to snap a browser open right at launch for instantaneous validation checks.
- Controls like ports and allowed extensions can be toggled inside `jorro-config.json`.
- Encompasses absolute minimal boundaries including explicit clearance exclusive to `GET` / `HEAD` commands, hiding undocumented paths, and obfuscating directory listings.
- Empowers Hot Reloading enabling instantaneous feedback mirroring routine edits through applications.
- Sized practically under 10MB executing minimal demands retaining memory thresholds in spans of mere tens of MBs.

## Reasons to Combine with MDGarden

Because MDGarden incorporates a "distribute static files over a browser rendering" approach, executing a static server proves absolute for regional/localhost testing operations.  
Jorro exhibits extraordinarily lightweight capabilities fused with portability bounds ensuring zero unmonitored leak hazards maintaining `localhost` boundaries strictly.

- Maintains environments fulfilling criteria mandating explicit `localhost` thresholds exactly requisite to launching "Author Mode".
- Streamlines the capacity to broadcast sequences wrapping `index.html` / `.md` / `.json` strings without embedding cumbersome middleware networks.
- Retains synchronization scaling the testing parameters concurrently parallel to eventual deployment staging frameworks.
- Synchronizes excellently adapting real-time edits pushed outwards owing entirely to inherent hot replacement protocols.

## Fastest Setup Strategy

1. Drop the Jorro executable format into routing folders dictating the broadcast structure equivalent to `docs/` mapped onto MDGarden setups.
2. Initialize Jorro exactly beside this designated environment space.
3. Validate MDGarden operating actively via the freshly dispatched browser portal.

## Recommended Settings (When coupled alongside MDGarden)

Example `jorro-config.json`:

```json
{
  "port": 8080,
  "indexFile": "index.html",
  "allowExtensions": [".html", ".css", ".js", ".md", ".json"],
  "hotReload": true,
  "devConsoleErrors": false
}
```

Key Points:

- Attach declarations spanning `.md` / `.json` into the `allowExtensions` threshold fields (imperative for MDGarden operation frameworks).
- Point exactly toward `index.html` executing within the `indexFile` argument.
- Trigger browser refresh synchronization cascades scaling file update adjustments by flagging `hotReload` arrays sequentially across to `true`.
- Streamline server side breakdown indications funneled directly toward browser console pipelines when initializing `devConsoleErrors` matrices accurately to `true`.

## Important Remarks

- Jorro was not forged retaining scopes intended for public networking execution standards[^1].
- Never directly transplant operational configurations nor execute binaries into public domain hosting layers transparently[^2].
- Retain continuous bounds asserting Author Mode parameters explicitly restricting deployment conditions spanning outside localhost thresholds strictly.
- Initializing `hotReload` combined alongside `devConsoleErrors` directly attaches Javascript injections mapping onto the pages during operational displays rendering views dynamically.

[^1]: Because it listens strictly through localhost, transmitting absolute static matrices, accessing frameworks navigating beyond the identical network environment / servers remains unequivocally blocked.
[^2]: Nevertheless, should executions mistakenly be provoked within the scopes of external public layouts, absolute external accessibility guarantees blockages shielding from tampering / leak hazards uniformly ensuring risk boundaries stay negligible.

Refer immediately directly correlating exhaustive documentation protocols mapped within Jorro's README layouts:

- https://github.com/lizard-isana/jorro/blob/main/README.md

## Back links
backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}
