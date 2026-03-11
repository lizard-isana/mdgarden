---
title: "MDGarden - Markdown + Plugin Extension Sample"
lastModified: "2026-03-08T00:30:00+09:00"
indexing: true
---

# Markdown + Plugin Extension Sample

This file is a sample to examine standard Markdown alongside MDView extensions (plugins).

toc{.toc}

---

## 1. Headings

# H1
## H2
### H3
#### H4
##### H5
###### H6

## 2. Emphasis

- **Bold**
- *Italic*
- ~~Strikethrough~~
- `Inline Code`

## 3. Lists

- Bullet 1
- Bullet 2
  - Nested 2-1

1. Numbered 1
2. Numbered 2
3. Numbered 3

- [x] Task complete
- [ ] Task incomplete

## 4. Blockquotes

> This is a blockquote.  
> It supports multiple lines as well.

## 5. Horizontal Rule

---

## 6. Links and Images

- [Internal Link (index.md)](index.md)
- [External Link (OpenAI)](https://openai.com){.external}

![Sample Image](https://picsum.photos/480/160)

## 7. Tables

| Item | Value | Memo |
|---|---:|---|
| A | 10 | left |
| B | 20 | center |
| C | 30 | right |

## 8. Code Blocks (Standard)

```text
plain text block
```

```js
const greet = (name) => `Hello, ${name}`;
console.log(greet("MDView"));
```

```bash
echo "markdown sample"
```

```json
{
  "name": "mdview",
  "type": "sample"
}
```

## 9. Footnotes

An example of a footnote[^1]. Another one[^longnote].

[^1]: This is a brief footnote.
[^longnote]: This is a lengthier footnote. Rendered via the Markdown-it footnote extension.

## 10. Attribute Extensions (markdown-it-attrs)

This paragraph is an example utilizing class designation.{.red}

## 11. Plugin: Highlight

You can check code highlighting alongside line numbers utilizing the `highlight` plugin.

```js
function sum(a, b) {
  return a + b;
}
```

## 12. Plugin: Math

```math
\[
\int_0^1 x^2 dx = \frac{1}{3}
\]
```

## 13. Plugin: Graph (c3)

```graph
{
  "data": {
    "columns": [
      ["data1", 30, 200, 100, 400, 150, 250],
      ["data2", 50, 20, 10, 40, 15, 25]
    ]
  }
}
```

## 14. Plugin: Chart (Mermaid)

```chart
graph TD
  A[Markdown] --> B[MDView]
  B --> C[Plugins]
  C --> D[Rendered]
```

## 16. Page List (Author Mode/Auto Indexer)

list{.auto-indexer-page-list sort-key="lastModified,path" sort-order="desc" limit="10"}

## 17. Back Links (Author Mode/Auto Indexer)

backlinks{.auto-indexer-backlinks sort-key="lastModified,path" sort-order="desc"}

<style>
  .red{
    color: red;
  }
</style> 


## 18. JS-RUN

```js-run
console.log("hello from sandbox");
const sum = [1, 2, 3].reduce((a, b) => a + b, 0);
return sum;
```

### Cave generation + A* pathfinding demo (deterministic seed)
This demo exemplifies generating a random cave map utilizing cellular automata and charting the shortest trajectory from starting entity S heading toward targeted endpoint G leaning on the A\* algorithm. `#` denotes walls, `.` establishes corridors, `*` signifies pathing identified during exploration. Resultantly, it returns operational outputs (reachability, expanded node volumes, spanning path length), permitting concurrent observation covering algorithmic processing layered alongside visualization logs all directly contained within js-run.

```js-run
// Cave generation + A* pathfinding demo (deterministic seed)
const W = 61;
const H = 31;
const WALL_INIT = 0.45;
const SMOOTH_STEPS = 5;
const seed = 1337;

// xorshift32
function rngFactory(s) {
  let x = s | 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return ((x >>> 0) / 4294967296);
  };
}
const rand = rngFactory(seed);

const grid = Array.from({ length: H }, () => Array(W).fill(1));

// init random walls
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    grid[y][x] = rand() < WALL_INIT ? 1 : 0;
  }
}

function countWallNeighbors(g, x, y) {
  let c = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) c++;
      else c += g[ny][nx];
    }
  }
  return c;
}

// smooth cellular automata
for (let step = 0; step < SMOOTH_STEPS; step++) {
  const next = Array.from({ length: H }, () => Array(W).fill(1));
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const n = countWallNeighbors(grid, x, y);
      next[y][x] = n >= 5 ? 1 : 0;
    }
  }
  for (let x = 0; x < W; x++) next[0][x] = next[H - 1][x] = 1;
  for (let y = 0; y < H; y++) next[y][0] = next[y][W - 1] = 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) grid[y][x] = next[y][x];
}

function randomFloor() {
  for (let i = 0; i < 5000; i++) {
    const x = 1 + (rand() * (W - 2)) | 0;
    const y = 1 + (rand() * (H - 2)) | 0;
    if (grid[y][x] === 0) return [x, y];
  }
  return null;
}

let start = randomFloor();
let goal = randomFloor();
if (!start || !goal) throw new Error("No floor cell found.");

function dist(a, b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); }
while (dist(start, goal) < (W + H) / 3) {
  const g2 = randomFloor();
  if (!g2) break;
  goal = g2;
}

// A*
const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
const key = (x,y) => `${x},${y}`;
const open = [{ x:start[0], y:start[1], g:0, f:dist(start, goal) }];
const came = new Map();
const gScore = new Map([[key(start[0], start[1]), 0]]);
const closed = new Set();

let expanded = 0;
let found = false;

while (open.length) {
  open.sort((a,b)=>a.f-b.f);
  const cur = open.shift();
  const ck = key(cur.x, cur.y);
  if (closed.has(ck)) continue;
  closed.add(ck);
  expanded++;

  if (cur.x === goal[0] && cur.y === goal[1]) { found = true; break; }

  for (const [dx,dy] of dirs) {
    const nx = cur.x + dx, ny = cur.y + dy;
    if (nx <= 0 || ny <= 0 || nx >= W-1 || ny >= H-1) continue;
    if (grid[ny][nx] === 1) continue;
    const nk = key(nx, ny);
    if (closed.has(nk)) continue;
    const ng = cur.g + 1;
    const old = gScore.get(nk);
    if (old === undefined || ng < old) {
      gScore.set(nk, ng);
      came.set(nk, ck);
      open.push({ x:nx, y:ny, g:ng, f:ng + Math.abs(nx-goal[0]) + Math.abs(ny-goal[1]) });
    }
  }
}

let path = [];
if (found) {
  let k = key(goal[0], goal[1]);
  while (k !== key(start[0], start[1])) {
    const [x,y] = k.split(",").map(Number);
    path.push([x,y]);
    k = came.get(k);
    if (!k) break;
  }
  path.push(start);
  path.reverse();
}

// render
const chars = grid.map(row => row.map(v => v ? "#" : "."));
for (const [x,y] of path) {
  if ((x === start[0] && y === start[1]) || (x === goal[0] && y === goal[1])) continue;
  chars[y][x] = "*";
}
chars[start[1]][start[0]] = "S";
chars[goal[1]][goal[0]] = "G";

console.log(`seed=${seed} size=${W}x${H} found=${found}`);
console.log(`expanded=${expanded} pathLength=${path.length}`);
for (let y = 0; y < H; y++) console.log(chars[y].join(""));

return {
  found,
  expanded,
  pathLength: path.length,
  start,
  goal
};

```

## 19. JS-DEMO

```js-demo
// libs: d3
const svg = api.d3
  .select(api.mount)
  .append("svg")
  .attr("width", api.width)
  .attr("height", api.height);
svg.append("circle").attr("cx", 80).attr("cy", 80).attr("r", 48).attr("fill", "#60a5fa");
return "ok";
```

This demo employs d3 to render correlation data generated via pseudo-random values mapped as a scatter plot chart. Designating js-demo's `api.mount` handling the drawing target, one can examine both preview layers alongside generated operational results (e.g. tracking scores) contained within the Result tab.
```js-demo
// libs: d3
api.clear();

const d3 = api.d3;
const width = Math.max(320, api.width);
const height = Math.max(220, api.height);
const margin = { top: 24, right: 24, bottom: 36, left: 44 };

function rng(seed) {
  let x = seed | 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
const rand = rng(20260307);

// Produce correlational pseudo-data mappings
const points = Array.from({ length: 120 }, (_, i) => {
  const x = i / 119;
  const noise = (rand() - 0.5) * 0.22;
  const y = 0.15 + 0.7 * x + noise;
  return { x, y: Math.max(0, Math.min(1, y)) };
});

const svg = d3
  .select(api.mount)
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("background", "#ffffff");

const x = d3.scaleLinear().domain([0, 1]).range([margin.left, width - margin.right]);
const y = d3.scaleLinear().domain([0, 1]).range([height - margin.bottom, margin.top]);

svg.append("g")
  .attr("transform", `translate(0,${height - margin.bottom})`)
  .call(d3.axisBottom(x).ticks(6));

svg.append("g")
  .attr("transform", `translate(${margin.left},0)`)
  .call(d3.axisLeft(y).ticks(5));

svg.selectAll(".domain, .tick line").attr("stroke", "#94a3b8");
svg.selectAll(".tick text").attr("fill", "#334155");

svg.append("g")
  .selectAll("circle")
  .data(points)
  .enter()
  .append("circle")
  .attr("cx", d => x(d.x))
  .attr("cy", d => y(d.y))
  .attr("r", 3.5)
  .attr("fill", "#2563eb")
  .attr("opacity", 0.9);

svg.append("text")
  .attr("x", margin.left)
  .attr("y", 16)
  .attr("fill", "#334155")
  .style("font", "12px sans-serif")
  .text("d3 scatter demo (seeded data)");

return { points: points.length, chart: "scatter" };
```

## 20. JS-RUN + Astronomy

```js-run
// libs: astronomy
const Astronomy = api.libs.astronomy;
if (!Astronomy) {
  throw new Error("Astronomy library is unavailable.");
}

const symbols = Object.keys(Astronomy).sort();
const now = new Date();
const moonPhase = typeof Astronomy.MoonPhase === "function"
  ? Astronomy.MoonPhase(now)
  : null;

console.log("Astronomy exports:", symbols.length);
return {
  now: now.toISOString(),
  moonPhase,
  sampleSymbols: symbols.slice(0, 16)
};
```

## 21. JS-DEMO + Astronomy

```js-demo
// libs: astronomy
api.clear();
const Astronomy = api.libs.astronomy;
if (!Astronomy || typeof Astronomy.MoonPhase !== "function") {
  throw new Error("Astronomy.MoonPhase is not available.");
}

const days = 30;
const intervalHours = 6;
const samplesCount = Math.floor((days * 24) / intervalHours) + 1;
const samples = [];
for (let i = 0; i < samplesCount; i++) {
  const date = new Date(Date.now() + i * intervalHours * 60 * 60 * 1000);
  // MoonPhase: 0-360 (0=new moon, 180=full moon)
  const phaseDeg = Astronomy.MoonPhase(date);
  // Convert wrapped phase angle to smooth illumination ratio (0..1)
  const illumination = 0.5 * (1 - Math.cos((phaseDeg * Math.PI) / 180));
  samples.push({
    step: i,
    label: date.toISOString().slice(0, 10),
    value: illumination
  });
}

const width = Math.max(380, api.width);
const height = Math.max(380, api.height);
const margin = { top: 24, right: 16, bottom: 28, left: 36 };
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

const svgNS = "http://www.w3.org/2000/svg";
const svg = document.createElementNS(svgNS, "svg");
svg.setAttribute("width", String(width));
svg.setAttribute("height", String(height));
svg.style.background = "#ffffff";
svg.style.display = "block";
api.mount.appendChild(svg);

const xOf = (i) => margin.left + (i / (samples.length - 1)) * innerW;
const yOf = (v) => margin.top + (1 - v) * innerH;

const grid = document.createElementNS(svgNS, "g");
grid.setAttribute("stroke", "#d1d5db");
for (let i = 0; i <= 4; i++) {
  const y = margin.top + (i / 4) * innerH;
  const line = document.createElementNS(svgNS, "line");
  line.setAttribute("x1", String(margin.left));
  line.setAttribute("x2", String(width - margin.right));
  line.setAttribute("y1", String(y));
  line.setAttribute("y2", String(y));
  grid.appendChild(line);
}
svg.appendChild(grid);

const path = document.createElementNS(svgNS, "path");
const d = samples
  .map((s, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yOf(s.value)}`)
  .join(" ");
path.setAttribute("d", d);
path.setAttribute("fill", "none");
path.setAttribute("stroke", "#2563eb");
path.setAttribute("stroke-width", "2");
svg.appendChild(path);

const title = document.createElementNS(svgNS, "text");
title.setAttribute("x", String(margin.left));
title.setAttribute("y", "16");
title.setAttribute("fill", "#334155");
title.setAttribute("font-size", "12");
title.textContent = "Moon illumination trend (next 30 days, 6h step)";
svg.appendChild(title);

return {
  firstDay: samples[0].label,
  lastDay: samples[samples.length - 1].label,
  minIllumination: Math.min(...samples.map((s) => s.value)),
  maxIllumination: Math.max(...samples.map((s) => s.value)),
  samples: samples.length
};
```
