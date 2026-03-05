const MERMAID_SCRIPT_URLS = [
  'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.4.1/mermaid.min.js'
];

const resolvePayloadRoot = (payload) => {
  if (payload && payload.target && payload.target.nodeType === 1) {
    return payload.target;
  }
  if (payload && payload.nodeType === 1) {
    return payload;
  }
  return null;
};

const renderCharts = (root) => {
  if (!window.mermaid) {
    return;
  }

  const newMermaidNodes = [];
  var chart_array = root.querySelectorAll('.language-chart');
  chart_array.forEach((element) => {
    if (element.dataset.mdgardenChartRendered === 'true') {
      return;
    }
    var p_node = element.parentNode;
    var chart_element = document.createElement('pre');
    chart_element.classList.add('mermaid');
    chart_element.innerHTML = element.innerHTML;
    p_node.parentNode.insertBefore(chart_element, p_node);
    p_node.style.display = 'none';
    element.dataset.mdgardenChartRendered = 'true';
    newMermaidNodes.push(chart_element);
  });

  if (newMermaidNodes.length > 0) {
    window.mermaid.initialize({ startOnLoad: false });
    window.mermaid.init(undefined, newMermaidNodes);
  }
};

const createChartPlugin = () => {
  let loaded = false;
  const loadFirstAvailable = async (ctx, urls, label) => {
    let lastError = null;
    for (const url of urls) {
      try {
        await ctx.loadScripts(url);
        return;
      } catch (error) {
        lastError = error;
        console.warn(`[MDGarden] Failed to load ${label}: ${url}`, error);
      }
    }
    throw lastError || new Error(`Failed to load ${label}`);
  };

  const ensureAssets = async (ctx) => {
    if (loaded) {
      return;
    }
    await loadFirstAvailable(ctx, MERMAID_SCRIPT_URLS, 'mermaid script');
    loaded = true;
  };

  return {
    name: 'chart',
    onEvent: async ({ event, payload, ctx }) => {
      if (event !== 'content_loaded' && event !== 'content_reloaded') {
        return;
      }
      const root = resolvePayloadRoot(payload);
      if (!root) {
        return;
      }
      await ensureAssets(ctx);
      renderCharts(root);
    }
  };
};

export { createChartPlugin };
