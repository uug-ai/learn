/*
 * Designer — interactive editor that produces JSON for the `{{< rete >}}`
 * shortcode used elsewhere in the learn content. Rendering reuses the same
 * DOM shape and CSS classes as assets/js/rete-diagram.js so the live preview
 * looks identical to the embedded diagrams.
 *
 * Self-contained, no dependencies. Vanilla DOM only.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

// --- Building-block catalogue. Each entry maps to a `kind` understood by the
// rete-diagram styling (see rete-diagram.css for the colour palette). ----

const PALETTE = [
    { kind: 'camera',  header: 'CAMERA',  title: 'Camera',  subtitle: 'RTSP://',          w: 200, h: 130 },
    { kind: 'agent',   header: 'AGENT',   title: 'Agent',   subtitle: 'Process stream',    w: 220, h: 140,
      badges: ['docker', 'linux', 'raspberrypi', 'kubernetes'] },
    { kind: 'vault',   header: 'VAULT',   title: 'Vault',   subtitle: 'Storage interface', w: 240, h: 150,
      badges: ['kubernetes'] },
    { kind: 'storage', header: 'OBJECT STORAGE', title: 'Object Storage', subtitle: 'Cloud / Edge',
      w: 240, h: 150, badges: ['minio', 'ceph', 'aws', 'gcp', 'azure'] },
    { kind: 'hub',     header: 'HUB',     title: 'Hub',     subtitle: 'Monitor and analyse', w: 240, h: 150,
      badges: ['kubernetes'] },
    { kind: 'factory', header: 'FACTORY', title: 'Factory', subtitle: 'Orchestrate',       w: 240, h: 150 },
    { kind: 'default', header: 'NODE',    title: 'Node',    subtitle: '',                  w: 200, h: 120 },
];

const KIND_LABELS = {
    camera: 'Camera', agent: 'Agent', vault: 'Vault', storage: 'Object Storage',
    hub: 'Hub', factory: 'Factory', default: 'Generic node',
};

// --- State ----------------------------------------------------------------

const state = {
    groups: [],
    nodes: [],
    connections: [],
    nextId: 1,
    selection: null, // { type: 'node'|'group'|'connection', id }
    mode: 'select',  // 'select' | 'connect'
    pending: null,   // { nodeId, side } for in-progress connection
};

function makeId(prefix) {
    return `${prefix}-${state.nextId++}`;
}

function nodeById(id) { return state.nodes.find(n => n.id === id); }
function groupById(id) { return state.groups.find(g => g.id === id); }

// --- Geometry helpers (mirrors rete-diagram.js) ---------------------------

function anchorPoint(node, side) {
    const w = node.w || 220, h = node.h || 120;
    switch (side) {
        case 'left':   return { x: node.x,         y: node.y + h / 2 };
        case 'right':  return { x: node.x + w,     y: node.y + h / 2 };
        case 'top':    return { x: node.x + w / 2, y: node.y };
        case 'bottom': return { x: node.x + w / 2, y: node.y + h };
        default:       return { x: node.x + w / 2, y: node.y + h / 2 };
    }
}

function bezierPath(x1, y1, x2, y2, fromSide, toSide) {
    const fromVertical = fromSide === 'top' || fromSide === 'bottom';
    const toVertical   = toSide   === 'top' || toSide   === 'bottom';
    let c1x, c1y, c2x, c2y;
    if (fromVertical) {
        const dy = Math.max(40, Math.abs(y2 - y1) * 0.4) * (fromSide === 'top' ? -1 : 1);
        c1x = x1; c1y = y1 + dy;
    } else {
        const dx = Math.max(40, Math.abs(x2 - x1) * 0.4) * (fromSide === 'left' ? -1 : 1);
        c1x = x1 + dx; c1y = y1;
    }
    if (toVertical) {
        const dy = Math.max(40, Math.abs(y2 - y1) * 0.4) * (toSide === 'top' ? -1 : 1);
        c2x = x2; c2y = y2 + dy;
    } else {
        const dx = Math.max(40, Math.abs(x2 - x1) * 0.4) * (toSide === 'left' ? -1 : 1);
        c2x = x2 + dx; c2y = y2;
    }
    return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
}

// --- DOM builders (match rete-diagram.js output) --------------------------

function buildNodeEl(n) {
    const el = document.createElement('div');
    el.className = `rete-node rete-node--${n.kind || 'default'}`;
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = '0';
    el.style.width = (n.w || 220) + 'px';
    el.style.height = (n.h || 120) + 'px';
    el.style.transform = `translate(${n.x}px, ${n.y}px)`;
    el.dataset.nodeId = n.id;

    if (n.header) {
        const header = document.createElement('div');
        header.className = 'rete-node__header';
        header.textContent = n.header;
        el.appendChild(header);
    }
    const body = document.createElement('div');
    body.className = 'rete-node__body';
    if (n.title) {
        const title = document.createElement('div');
        title.className = 'rete-node__title';
        title.textContent = n.title;
        body.appendChild(title);
    }
    if (n.subtitle) {
        const sub = document.createElement('div');
        sub.className = 'rete-node__subtitle';
        sub.textContent = n.subtitle;
        body.appendChild(sub);
    }
    if (Array.isArray(n.badges) && n.badges.length) {
        const badges = document.createElement('div');
        badges.className = 'rete-node__badges';
        n.badges.forEach(slug => {
            const img = document.createElement('img');
            img.className = 'rete-node__badge';
            img.alt = slug;
            img.title = slug;
            img.loading = 'lazy';
            img.src = `/icons/brands/${slug}.svg`;
            badges.appendChild(img);
        });
        body.appendChild(badges);
    }
    el.appendChild(body);
    return el;
}

function buildGroupEl(g) {
    const el = document.createElement('div');
    el.className = 'rete-group';
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = '0';
    el.style.width = g.w + 'px';
    el.style.height = g.h + 'px';
    el.style.transform = `translate(${g.x}px, ${g.y}px)`;
    el.dataset.groupId = g.id;
    if (g.label) {
        const label = document.createElement('div');
        label.className = 'rete-group__label';
        label.textContent = g.label;
        el.appendChild(label);
    }
    return el;
}

// --- Editor class ---------------------------------------------------------

class Designer {
    constructor(root) {
        this.root = root;
        this.canvas = root.querySelector('#designer-canvas');
        this.inspector = root.querySelector('#designer-inspector');
        this.paletteEl = root.querySelector('[data-palette]');
        this.sourceEl = root.querySelector('#designer-source');
        this.toastEl = document.querySelector('#designer-toast');

        // Canvas layers: groups, connection svg, nodes, anchor handles.
        this.viewport = document.createElement('div');
        this.viewport.className = 'rete-viewport';
        Object.assign(this.viewport.style, {
            position: 'absolute', left: '0', top: '0', transformOrigin: '0 0',
            width: '100%', height: '100%',
        });
        this.canvas.appendChild(this.viewport);

        this.groupLayer = document.createElement('div');
        this.groupLayer.className = 'rete-group-layer';
        Object.assign(this.groupLayer.style, { position: 'absolute', inset: '0' });
        this.viewport.appendChild(this.groupLayer);

        this.svg = document.createElementNS(SVG_NS, 'svg');
        this.svg.setAttribute('class', 'rete-connections');
        Object.assign(this.svg.style, {
            position: 'absolute', left: '0', top: '0', overflow: 'visible',
        });
        this.viewport.appendChild(this.svg);

        this.nodeLayer = document.createElement('div');
        this.nodeLayer.className = 'rete-node-layer';
        Object.assign(this.nodeLayer.style, { position: 'absolute', inset: '0' });
        this.viewport.appendChild(this.nodeLayer);

        this.anchorLayer = document.createElement('div');
        this.anchorLayer.className = 'designer__anchor-layer';
        Object.assign(this.anchorLayer.style, {
            position: 'absolute', inset: '0', pointerEvents: 'none',
        });
        this.viewport.appendChild(this.anchorLayer);

        // Pan/zoom transform.
        this.scale = 1; this.tx = 80; this.ty = 80;
        this.applyViewport();

        this.nodeEls = new Map();
        this.groupEls = new Map();

        this.buildPalette();
        this.bindToolbar();
        this.bindCanvasInput();
        this.bindKeyboard();
        this.seedExample();
        this.render();
    }

    // ------------------------------------------------------------------ UI

    buildPalette() {
        PALETTE.forEach(spec => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'designer__palette-item';
            btn.innerHTML = `
                <span class="designer__palette-swatch rete-node--${spec.kind}"></span>
                <span class="designer__palette-label">${KIND_LABELS[spec.kind] || spec.kind}</span>
            `;
            btn.addEventListener('click', () => this.addNodeFromSpec(spec));
            this.paletteEl.appendChild(btn);
        });
        this.root.querySelector('[data-add-group]')
            ?.addEventListener('click', () => this.addGroup());
    }

    bindToolbar() {
        this.root.querySelectorAll('.designer__btn[data-action]').forEach(btn => {
            btn.addEventListener('click', () => this.handleAction(btn.dataset.action, btn));
        });
    }

    handleAction(action, btn) {
        switch (action) {
            case 'connect': this.toggleConnectMode(btn); break;
            case 'fit':     this.fit(); break;
            case 'fullscreen': this.toggleFullscreen(); break;
            case 'clear':
                if (state.nodes.length || state.groups.length) {
                    if (!confirm('Remove all nodes, groups and connections?')) return;
                }
                state.groups = []; state.nodes = []; state.connections = [];
                state.selection = null;
                this.render();
                break;
            case 'copy':    this.copyShortcode(); break;
        }
    }

    toggleConnectMode(btn) {
        state.mode = state.mode === 'connect' ? 'select' : 'connect';
        state.pending = null;
        if (btn) btn.setAttribute('aria-pressed', String(state.mode === 'connect'));
        this.canvas.classList.toggle('designer__canvas--connecting', state.mode === 'connect');
        this.renderAnchors();
        this.toast(state.mode === 'connect'
            ? 'Connect mode: click an anchor on the source, then on the target.'
            : 'Select mode.');
    }

    toggleFullscreen() {
        const on = !this.root.classList.contains('is-fullscreen');
        this.root.classList.toggle('is-fullscreen', on);
        document.body.classList.toggle('designer-fs-lock', on);
        const btn = this.root.querySelector('.designer__btn[data-action="fullscreen"]');
        if (btn) {
            btn.setAttribute('aria-pressed', String(on));
            btn.title = on ? 'Exit fullscreen' : 'Toggle fullscreen';
        }
        // Two RAFs: one for layout to apply the new size, one to refit.
        requestAnimationFrame(() => requestAnimationFrame(() => this.fit()));
    }

    // ----------------------------------------------------------- CRUD ops

    addNodeFromSpec(spec) {
        const id = makeId(spec.kind || 'node');
        // Drop new nodes near the centre of the visible canvas (compensating
        // for the current pan/zoom transform).
        const rect = this.canvas.getBoundingClientRect();
        const cx = (rect.width  / 2 - this.tx) / this.scale;
        const cy = (rect.height / 2 - this.ty) / this.scale;
        const node = {
            id,
            kind: spec.kind || 'default',
            x: Math.round(cx - (spec.w || 200) / 2 + (state.nodes.length % 5) * 24),
            y: Math.round(cy - (spec.h || 130) / 2 + (state.nodes.length % 5) * 24),
            w: spec.w || 200,
            h: spec.h || 130,
            header: spec.header || '',
            title:  spec.title  || '',
            subtitle: spec.subtitle || '',
            badges: spec.badges ? [...spec.badges] : [],
        };
        state.nodes.push(node);
        this.select({ type: 'node', id });
        this.render();
    }

    addGroup() {
        const id = makeId('group');
        const rect = this.canvas.getBoundingClientRect();
        const cx = (rect.width  / 2 - this.tx) / this.scale;
        const cy = (rect.height / 2 - this.ty) / this.scale;
        const group = {
            id, label: 'Group',
            x: Math.round(cx - 200), y: Math.round(cy - 200),
            w: 400, h: 400,
        };
        state.groups.push(group);
        this.select({ type: 'group', id });
        this.render();
    }

    deleteSelection() {
        if (!state.selection) return;
        const { type, id } = state.selection;
        if (type === 'node') {
            state.nodes = state.nodes.filter(n => n.id !== id);
            state.connections = state.connections.filter(c => c.from !== id && c.to !== id);
        } else if (type === 'group') {
            state.groups = state.groups.filter(g => g.id !== id);
        } else if (type === 'connection') {
            state.connections.splice(id, 1); // id is index for connections
        }
        state.selection = null;
        this.render();
    }

    select(sel) {
        state.selection = sel;
        this.renderInspector();
        this.renderSelection();
    }

    // ------------------------------------------------------------- Render

    render() {
        // Groups.
        this.groupLayer.innerHTML = '';
        this.groupEls.clear();
        state.groups.forEach(g => {
            const el = buildGroupEl(g);
            this.groupLayer.appendChild(el);
            this.groupEls.set(g.id, el);
            this.attachGroupHandlers(g, el);
        });

        // Nodes.
        this.nodeLayer.innerHTML = '';
        this.nodeEls.clear();
        state.nodes.forEach(n => {
            const el = buildNodeEl(n);
            this.nodeLayer.appendChild(el);
            this.nodeEls.set(n.id, el);
            this.attachNodeHandlers(n, el);
        });

        this.renderConnections();
        this.renderAnchors();
        this.renderSelection();
        this.renderInspector();
        this.renderSource();
    }

    renderConnections() {
        // Compute SVG bounds covering all geometry.
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        state.groups.forEach(g => {
            minX = Math.min(minX, g.x); minY = Math.min(minY, g.y);
            maxX = Math.max(maxX, g.x + g.w); maxY = Math.max(maxY, g.y + g.h);
        });
        state.nodes.forEach(n => {
            minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + (n.w || 220));
            maxY = Math.max(maxY, n.y + (n.h || 120));
        });
        if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 1200; maxY = 800; }
        const pad = 60;
        this.svg.setAttribute('viewBox',
            `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`);
        this.svg.style.left   = (minX - pad) + 'px';
        this.svg.style.top    = (minY - pad) + 'px';
        this.svg.style.width  = (maxX - minX + pad * 2) + 'px';
        this.svg.style.height = (maxY - minY + pad * 2) + 'px';

        this.svg.innerHTML = '';
        state.connections.forEach((c, idx) => {
            const from = nodeById(c.from);
            const to   = nodeById(c.to);
            if (!from || !to) return;
            const fromSide = c.fromSide || 'right';
            const toSide   = c.toSide   || 'left';
            const a = anchorPoint(from, fromSide);
            const b = anchorPoint(to,   toSide);
            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('d', bezierPath(a.x, a.y, b.x, b.y, fromSide, toSide));
            const classes = ['rete-connection', `rete-connection--${c.kind || 'default'}`];
            if (c.label) classes.push('rete-connection--labelled');
            if (state.selection?.type === 'connection' && state.selection.id === idx) {
                classes.push('is-selected');
            }
            path.setAttribute('class', classes.join(' '));
            path.style.pointerEvents = 'stroke';
            path.addEventListener('click', e => {
                e.stopPropagation();
                this.select({ type: 'connection', id: idx });
            });
            this.svg.appendChild(path);

            if (c.label) {
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2;
                let angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
                if (angle > 90)  angle -= 180;
                if (angle < -90) angle += 180;
                const text = document.createElementNS(SVG_NS, 'text');
                text.setAttribute('x', mx);
                text.setAttribute('y', my);
                text.setAttribute('class', 'rete-connection__label');
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'middle');
                text.setAttribute('transform', `rotate(${angle} ${mx} ${my})`);
                text.textContent = c.label;
                this.svg.appendChild(text);
            }
        });
    }

    renderAnchors() {
        this.anchorLayer.innerHTML = '';
        if (state.mode !== 'connect') return;
        state.nodes.forEach(n => {
            ['top', 'right', 'bottom', 'left'].forEach(side => {
                const p = anchorPoint(n, side);
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'designer__anchor';
                if (state.pending && state.pending.nodeId === n.id && state.pending.side === side) {
                    dot.classList.add('designer__anchor--pending');
                }
                dot.style.left = p.x + 'px';
                dot.style.top  = p.y + 'px';
                dot.title = `${n.id} · ${side}`;
                dot.addEventListener('mousedown', e => { e.stopPropagation(); });
                dot.addEventListener('click', e => {
                    e.stopPropagation();
                    this.handleAnchorClick(n.id, side);
                });
                this.anchorLayer.appendChild(dot);
            });
        });
    }

    handleAnchorClick(nodeId, side) {
        if (!state.pending) {
            state.pending = { nodeId, side };
            this.renderAnchors();
            return;
        }
        if (state.pending.nodeId === nodeId) {
            // Clicking the same node cancels.
            state.pending = null;
            this.renderAnchors();
            return;
        }
        state.connections.push({
            from: state.pending.nodeId,
            to: nodeId,
            fromSide: state.pending.side,
            toSide: side,
        });
        state.pending = null;
        this.render();
    }

    renderSelection() {
        this.nodeLayer.querySelectorAll('.rete-node').forEach(el => {
            el.classList.toggle('is-selected',
                state.selection?.type === 'node' && el.dataset.nodeId === state.selection.id);
        });
        this.groupLayer.querySelectorAll('.rete-group').forEach(el => {
            el.classList.toggle('is-selected',
                state.selection?.type === 'group' && el.dataset.groupId === state.selection.id);
        });
    }

    renderInspector() {
        const sel = state.selection;
        if (!sel) {
            this.inspector.innerHTML = '<p class="designer__inspector-empty">Select a node or group to edit its properties.</p>';
            return;
        }
        if (sel.type === 'node') return this.renderNodeInspector(nodeById(sel.id));
        if (sel.type === 'group') return this.renderGroupInspector(groupById(sel.id));
        if (sel.type === 'connection') return this.renderConnectionInspector(sel.id);
    }

    renderNodeInspector(n) {
        if (!n) return;
        const kinds = ['camera', 'agent', 'vault', 'storage', 'hub', 'factory', 'default'];
        this.inspector.innerHTML = `
            <div class="designer__field">
                <label>Kind</label>
                <select data-field="kind">
                    ${kinds.map(k => `<option value="${k}"${k === n.kind ? ' selected' : ''}>${KIND_LABELS[k]}</option>`).join('')}
                </select>
            </div>
            <div class="designer__field">
                <label>Header</label>
                <input type="text" data-field="header" value="${escapeHtml(n.header || '')}">
            </div>
            <div class="designer__field">
                <label>Title</label>
                <input type="text" data-field="title" value="${escapeHtml(n.title || '')}">
            </div>
            <div class="designer__field">
                <label>Subtitle</label>
                <input type="text" data-field="subtitle" value="${escapeHtml(n.subtitle || '')}">
            </div>
            <div class="designer__field-row">
                <div class="designer__field">
                    <label>Width</label>
                    <input type="number" min="120" step="10" data-field="w" value="${n.w}">
                </div>
                <div class="designer__field">
                    <label>Height</label>
                    <input type="number" min="80" step="10" data-field="h" value="${n.h}">
                </div>
            </div>
            <div class="designer__field">
                <label>Badges (comma separated)</label>
                <input type="text" data-field="badges" value="${escapeHtml((n.badges || []).join(', '))}"
                       placeholder="docker, linux, kubernetes">
            </div>
            <div class="designer__field">
                <label>ID</label>
                <input type="text" data-field="id" value="${escapeHtml(n.id)}">
            </div>
            <button type="button" class="designer__danger" data-delete>Delete node</button>
        `;
        this.bindInspector(n, 'node');
    }

    renderGroupInspector(g) {
        if (!g) return;
        this.inspector.innerHTML = `
            <div class="designer__field">
                <label>Label</label>
                <input type="text" data-field="label" value="${escapeHtml(g.label || '')}">
            </div>
            <div class="designer__field-row">
                <div class="designer__field">
                    <label>Width</label>
                    <input type="number" min="80" step="10" data-field="w" value="${g.w}">
                </div>
                <div class="designer__field">
                    <label>Height</label>
                    <input type="number" min="80" step="10" data-field="h" value="${g.h}">
                </div>
            </div>
            <div class="designer__field">
                <label>ID</label>
                <input type="text" data-field="id" value="${escapeHtml(g.id)}">
            </div>
            <button type="button" class="designer__danger" data-delete>Delete group</button>
        `;
        this.bindInspector(g, 'group');
    }

    renderConnectionInspector(idx) {
        const c = state.connections[idx];
        if (!c) return;
        const sides = ['left', 'right', 'top', 'bottom'];
        const kinds = ['default', 'thick', 'dashed'];
        this.inspector.innerHTML = `
            <div class="designer__field-row">
                <div class="designer__field">
                    <label>From side</label>
                    <select data-field="fromSide">
                        ${sides.map(s => `<option value="${s}"${(c.fromSide || 'right') === s ? ' selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="designer__field">
                    <label>To side</label>
                    <select data-field="toSide">
                        ${sides.map(s => `<option value="${s}"${(c.toSide || 'left') === s ? ' selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="designer__field">
                <label>Kind</label>
                <select data-field="kind">
                    ${kinds.map(k => `<option value="${k}"${(c.kind || 'default') === k ? ' selected' : ''}>${k}</option>`).join('')}
                </select>
            </div>
            <div class="designer__field">
                <label>Label (optional)</label>
                <input type="text" data-field="label" value="${escapeHtml(c.label || '')}">
            </div>
            <button type="button" class="designer__danger" data-delete>Delete connection</button>
        `;
        this.bindInspector(c, 'connection');
    }

    bindInspector(target, type) {
        this.inspector.querySelectorAll('[data-field]').forEach(input => {
            input.addEventListener('input', () => {
                const field = input.dataset.field;
                let value = input.value;
                if (field === 'w' || field === 'h') {
                    value = Math.max(40, parseInt(value, 10) || 0);
                } else if (field === 'badges') {
                    value = value.split(',').map(s => s.trim()).filter(Boolean);
                } else if (field === 'id') {
                    value = value.trim().replace(/\s+/g, '-');
                    if (!value) return;
                    if (type === 'node') {
                        state.connections.forEach(c => {
                            if (c.from === target.id) c.from = value;
                            if (c.to === target.id) c.to = value;
                        });
                        if (state.selection?.type === 'node') state.selection.id = value;
                    } else if (type === 'group' && state.selection?.type === 'group') {
                        state.selection.id = value;
                    }
                }
                target[field] = value;
                this.render();
            });
        });
        this.inspector.querySelector('[data-delete]')
            ?.addEventListener('click', () => this.deleteSelection());
    }

    renderSource() {
        const cfg = {
            groups: state.groups.map(g => ({
                id: g.id, label: g.label,
                x: g.x, y: g.y, w: g.w, h: g.h,
            })),
            nodes: state.nodes.map(n => {
                const out = {
                    id: n.id, kind: n.kind,
                    x: n.x, y: n.y, w: n.w, h: n.h,
                    header: n.header, title: n.title,
                };
                if (n.subtitle) out.subtitle = n.subtitle;
                if (n.badges && n.badges.length) out.badges = n.badges;
                return out;
            }),
            connections: state.connections.map(c => {
                const out = { from: c.from, to: c.to };
                if (c.fromSide) out.fromSide = c.fromSide;
                if (c.toSide)   out.toSide   = c.toSide;
                if (c.kind && c.kind !== 'default') out.kind = c.kind;
                if (c.label) out.label = c.label;
                return out;
            }),
        };
        this.lastShortcode =
            '{{< rete caption="My diagram" >}}\n' +
            JSON.stringify(cfg, null, 2) + '\n' +
            '{{< /rete >}}';
        if (this.sourceEl) this.sourceEl.textContent = this.lastShortcode;
    }

    async copyShortcode() {
        const text = this.lastShortcode || '';
        try {
            await navigator.clipboard.writeText(text);
            this.toast('Copied shortcode to clipboard.');
        } catch (err) {
            // Fallback for browsers without clipboard API.
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); this.toast('Copied shortcode to clipboard.'); }
            catch { this.toast('Copy failed — select the preview manually.'); }
            ta.remove();
        }
    }

    toast(msg) {
        if (!this.toastEl) return;
        this.toastEl.textContent = msg;
        this.toastEl.classList.add('is-visible');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => this.toastEl.classList.remove('is-visible'), 2000);
    }

    // -------------------------------------------------------- Interaction

    applyViewport() {
        this.viewport.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.scale})`;
    }

    fit() {
        const rect = this.canvas.getBoundingClientRect();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        state.groups.forEach(g => {
            minX = Math.min(minX, g.x); minY = Math.min(minY, g.y);
            maxX = Math.max(maxX, g.x + g.w); maxY = Math.max(maxY, g.y + g.h);
        });
        state.nodes.forEach(n => {
            minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + (n.w || 220));
            maxY = Math.max(maxY, n.y + (n.h || 120));
        });
        if (!isFinite(minX) || rect.width === 0) { this.applyViewport(); return; }
        const cw = maxX - minX, ch = maxY - minY;
        const margin = 60;
        this.scale = Math.min(
            (rect.width - margin * 2) / cw,
            (rect.height - margin * 2) / ch,
            1.2
        );
        if (!isFinite(this.scale) || this.scale <= 0) this.scale = 1;
        this.tx = (rect.width  - cw * this.scale) / 2 - minX * this.scale;
        this.ty = (rect.height - ch * this.scale) / 2 - minY * this.scale;
        this.applyViewport();
    }

    bindCanvasInput() {
        // Pan + click-to-deselect.
        let panning = false, sx = 0, sy = 0, otx = 0, oty = 0, moved = false;
        this.canvas.addEventListener('mousedown', e => {
            if (e.target.closest('.rete-node, .rete-group, .designer__anchor, .rete-connection')) return;
            panning = true; moved = false;
            sx = e.clientX; sy = e.clientY; otx = this.tx; oty = this.ty;
            this.canvas.style.cursor = 'grabbing';
            e.preventDefault();
        });
        window.addEventListener('mousemove', e => {
            if (!panning) return;
            const dx = e.clientX - sx, dy = e.clientY - sy;
            if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
            this.tx = otx + dx; this.ty = oty + dy;
            this.applyViewport();
        });
        window.addEventListener('mouseup', () => {
            if (!panning) return;
            const wasMoved = moved;
            panning = false;
            this.canvas.style.cursor = '';
            if (!wasMoved) {
                // Click on empty canvas: clear selection.
                if (state.selection) this.select(null);
            }
        });

        // Zoom on wheel (always on, this is an editor).
        this.canvas.addEventListener('wheel', e => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const factor = Math.exp(-e.deltaY * 0.0015);
            const next = Math.max(0.2, Math.min(4, this.scale * factor));
            this.tx = cx - (cx - this.tx) * (next / this.scale);
            this.ty = cy - (cy - this.ty) * (next / this.scale);
            this.scale = next;
            this.applyViewport();
        }, { passive: false });
    }

    attachNodeHandlers(n, el) {
        let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false;
        el.addEventListener('mousedown', e => {
            if (state.mode === 'connect') return;
            dragging = true; moved = false;
            sx = e.clientX; sy = e.clientY; ox = n.x; oy = n.y;
            el.classList.add('is-dragging');
            e.stopPropagation();
            e.preventDefault();
        });
        window.addEventListener('mousemove', e => {
            if (!dragging) return;
            const dx = (e.clientX - sx) / this.scale;
            const dy = (e.clientY - sy) / this.scale;
            if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
            n.x = Math.round(ox + dx);
            n.y = Math.round(oy + dy);
            el.style.transform = `translate(${n.x}px, ${n.y}px)`;
            this.renderConnections();
            if (state.mode === 'connect') this.renderAnchors();
        });
        window.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            el.classList.remove('is-dragging');
            if (!moved) {
                this.select({ type: 'node', id: n.id });
            } else {
                this.renderSource();
            }
        });
    }

    attachGroupHandlers(g, el) {
        let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false;
        el.addEventListener('mousedown', e => {
            if (state.mode === 'connect') return;
            // Only drag when the click is on the group's own surface, not on a child node.
            if (e.target !== el && !e.target.classList.contains('rete-group__label')) return;
            dragging = true; moved = false;
            sx = e.clientX; sy = e.clientY; ox = g.x; oy = g.y;
            e.stopPropagation();
            e.preventDefault();
        });
        window.addEventListener('mousemove', e => {
            if (!dragging) return;
            const dx = (e.clientX - sx) / this.scale;
            const dy = (e.clientY - sy) / this.scale;
            if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
            g.x = Math.round(ox + dx);
            g.y = Math.round(oy + dy);
            el.style.transform = `translate(${g.x}px, ${g.y}px)`;
            this.renderConnections();
        });
        window.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            if (!moved) {
                this.select({ type: 'group', id: g.id });
            } else {
                this.renderSource();
            }
        });
    }

    bindKeyboard() {
        window.addEventListener('keydown', e => {
            // Ignore typing inside the inspector / palette inputs.
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (state.selection) {
                    e.preventDefault();
                    this.deleteSelection();
                }
            } else if (e.key === 'Escape') {
                if (state.mode === 'connect') {
                    const btn = this.root.querySelector('.designer__btn[data-action="connect"]');
                    this.toggleConnectMode(btn);
                } else if (this.root.classList.contains('is-fullscreen')) {
                    this.toggleFullscreen();
                } else if (state.selection) {
                    this.select(null);
                }
            }
        });
    }

    seedExample() {
        // A friendly starting diagram so the page isn't empty on first paint.
        state.groups = [
            { id: 'edge',  label: 'Edge',  x:   0, y: 20, w: 480, h: 360 },
            { id: 'cloud', label: 'Cloud', x: 600, y: 20, w: 360, h: 360 },
        ];
        state.nodes = [
            { id: 'cam-1', kind: 'camera', x:  40, y:  90, w: 180, h: 130,
              header: 'CAMERA', title: 'Camera 1', subtitle: 'RTSP://' },
            { id: 'agent-1', kind: 'agent', x: 250, y:  85, w: 200, h: 140,
              header: 'AGENT', title: 'Agent 1', subtitle: 'Process stream',
              badges: ['docker', 'kubernetes'] },
            { id: 'hub', kind: 'hub', x: 660, y: 130, w: 240, h: 150,
              header: 'HUB', title: 'Hub', subtitle: 'Monitor and analyse',
              badges: ['kubernetes'] },
        ];
        state.connections = [
            { from: 'cam-1', to: 'agent-1', fromSide: 'right', toSide: 'left' },
            { from: 'agent-1', to: 'hub',   fromSide: 'right', toSide: 'left' },
        ];
        state.nextId = 10;
    }
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function bootstrap() {
    const root = document.getElementById('designer');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';
    new Designer(root);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
