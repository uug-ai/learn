// Bug reports go through inspect on staging only; learn.uug.ai never loads it.
(() => {
  const host = location.hostname;
  if (host !== 'uug.lol' && !host.endsWith('.uug.lol')) return;
  if (window.__uugLearnInspect) return;
  window.__uugLearnInspect = true;
  const endpoint = 'https://inspect.uug.ai';
  const script = document.createElement('script');
  script.src = `${endpoint}/static/lib/inspect.js`;
  script.async = true;
  script.onload = () => window.UugInspect?.createInspect({
    endpoint,
    repo: 'uug-ai/learn',
    getContext: () => ({ app: 'learn' }),
  });
  document.head.append(script);
})();
