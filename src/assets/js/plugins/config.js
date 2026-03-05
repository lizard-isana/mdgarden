import { createTocPlugin } from './toc-plugin.js';
import { createHighlightPlugin } from './highlight-plugin.js';
import { createMathPlugin } from './math-plugin.js';
import { createGraphPlugin } from './graph-plugin.js';
import { createChartPlugin } from './chart-plugin.js';
import { createInlineSpaPlugin } from './inline-spa-plugin.js';
import { createAuthorModePlugin } from './author-mode-plugin.js';

const PluginConfig = Object.freeze({
  defaultPlugins: ['toc', 'author-mode'],
  registry: {
    toc: {
      create: () => createTocPlugin()
    },
    highlight: {
      create: (viewer) => createHighlightPlugin({
        style: viewer.dataset.highlightStyle || 'github'
      })
    },
    math: {
      create: () => createMathPlugin()
    },
    graph: {
      create: () => createGraphPlugin()
    },
    chart: {
      create: () => createChartPlugin()
    },
    'inline-spa': {
      create: () => createInlineSpaPlugin()
    },
    'author-mode': {
      create: () => createAuthorModePlugin()
    },
    // Backward-compatible alias
    'auto-indexer': {
      create: () => createAuthorModePlugin()
    }
  }
});

export { PluginConfig };
