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

const PALETTE_SECTIONS = [
    {
        title: 'General',
        items: [
            { kind: 'camera',  header: 'CAMERA',         title: 'Camera',         subtitle: 'RTSP://',     w: 200, h: 130 },
            { kind: 'storage', header: 'OBJECT STORAGE', title: 'Object Storage', subtitle: 'Cloud / Edge', w: 240, h: 150,
              badges: ['minio', 'ceph', 'aws', 'gcp', 'azure'] },
            { kind: 'default', header: 'NODE',           title: 'Node',           subtitle: '',            w: 200, h: 120 },
        ],
    },
    {
        title: 'Applications',
        items: [
            { kind: 'agent',   header: 'AGENT',   title: 'Agent',   subtitle: 'Process stream',     w: 220, h: 140,
              badges: ['docker', 'linux', 'raspberrypi', 'kubernetes'] },
            { kind: 'vault',   header: 'VAULT',   title: 'Vault',   subtitle: 'Storage interface',  w: 240, h: 150,
              badges: ['kubernetes'] },
            { kind: 'hub',     header: 'HUB',     title: 'Hub',     subtitle: 'Monitor and analyse', w: 240, h: 150,
              badges: ['kubernetes'] },
            { kind: 'factory', header: 'FACTORY', title: 'Factory', subtitle: 'Orchestrate',        w: 240, h: 150 },
        ],
    },
    {
        title: 'Dependencies',
        items: [
            { kind: 'amqp', header: 'AMQP', title: 'AMQP', subtitle: 'Message broker',     w: 220, h: 130 },
            { kind: 'turn', header: 'TURN', title: 'TURN', subtitle: 'WebRTC relay',        w: 220, h: 130 },
            { kind: 'mqtt', header: 'MQTT', title: 'MQTT', subtitle: 'Pub/sub broker',      w: 220, h: 130 },
        ],
    },
];

// Flat list kept for any consumers that just want the full catalogue.
const PALETTE = PALETTE_SECTIONS.flatMap(s => s.items);

const KIND_LABELS = {
    camera: 'Camera', agent: 'Agent', vault: 'Vault', storage: 'Object Storage',
    hub: 'Hub', factory: 'Factory',
    amqp: 'AMQP', turn: 'TURN', mqtt: 'MQTT',
    default: 'Generic node',
};

// Grid step (in canvas units) used to align nodes/groups during drag and
// resize. Holding Shift while dragging temporarily disables snapping for
// freeform placement.
const GRID = 20;
const snap = (v) => Math.round(v / GRID) * GRID;

// --- State ----------------------------------------------------------------

const state = {
    groups: [],
    nodes: [],
    connections: [],
    nextId: 1,
    selection: null, // { type: 'node'|'group'|'connection', id }
    pending: null,   // { nodeId, side } for in-progress connection
};

// Undo/redo: snapshots of the data-bearing parts of `state`. `selection`
// and `pending` are intentionally excluded so undoing doesn't move focus
// around or cancel in-progress interactions.
const history = {
    past: [],
    future: [],
    limit: 100,
};

function snapshotState() {
    return JSON.stringify({
        groups: state.groups,
        nodes: state.nodes,
        connections: state.connections,
        nextId: state.nextId,
    });
}

function restoreSnapshot(snap) {
    const data = JSON.parse(snap);
    state.groups = data.groups;
    state.nodes = data.nodes;
    state.connections = data.connections;
    state.nextId = data.nextId;
    // Drop selection if it points to something that no longer exists.
    if (state.selection) {
        const { type, id } = state.selection;
        if (type === 'node' && !state.nodes.find(n => n.id === id)) state.selection = null;
        else if (type === 'group' && !state.groups.find(g => g.id === id)) state.selection = null;
        else if (type === 'connection' && !state.connections[id]) state.selection = null;
    }
    state.pending = null;
}

function makeId(prefix) {
    return `${prefix}-${state.nextId++}`;
}

function nodeById(id) { return state.nodes.find(n => n.id === id); }
function groupById(id) { return state.groups.find(g => g.id === id); }

// Returns the first group whose rectangle fully contains the node's bounding
// box, or `null` if the node is free. Used to auto-couple on drop.
function containingGroup(n) {
    const w = n.w || 220, h = n.h || 120;
    return state.groups.find(g =>
        n.x >= g.x && n.y >= g.y &&
        n.x + w <= g.x + g.w &&
        n.y + h <= g.y + g.h
    ) || null;
}

// Clamp a node's (x, y) so its rectangle stays inside the given group.
function clampToGroup(n, g) {
    const w = n.w || 220, h = n.h || 120;
    const maxX = g.x + g.w - w;
    const maxY = g.y + g.h - h;
    return {
        x: Math.max(g.x, Math.min(maxX, n.x)),
        y: Math.max(g.y, Math.min(maxY, n.y)),
    };
}

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
    if (n.groupId) el.classList.add('rete-node--coupled');
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = '0';
    el.style.width = (n.w || 220) + 'px';
    el.style.height = (n.h || 120) + 'px';
    el.style.transform = `translate(${n.x}px, ${n.y}px)`;
    el.dataset.nodeId = n.id;
    if (n.groupId) el.dataset.groupId = n.groupId;

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
    // Resize handles — only visible while the group is selected (CSS).
    ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(dir => {
        const h = document.createElement('div');
        h.className = `designer__resize designer__resize--${dir}`;
        h.dataset.dir = dir;
        el.appendChild(h);
    });
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

        this.buildMinimap();

        // Pan/zoom transform.
        this.scale = 1; this.tx = 80; this.ty = 80;
        this.applyViewport();

        this.nodeEls = new Map();
        this.groupEls = new Map();

        this.buildPalette();
        this.bindToolbar();
        this.bindCanvasInput();
        this.bindKeyboard();
        this.bindAltHint();
        if (!this.loadFromUrl()) {
            this.seedExample();
        }
        this.render();
        // Start with the properties panel collapsed; selecting something
        // will open it.
        this.toggleInspector(true);
        // Run an initial fit on the next frame so the canvas has measured
        // dimensions when called via URL with a large diagram.
        requestAnimationFrame(() => this.fit());
    }

    // Try to populate state from the URL fragment, e.g.
    //   /designer/#diagram=<base64-of-json>&fullscreen=1
    // Returns true on success.
    loadFromUrl() {
        const hash = (window.location.hash || '').replace(/^#/, '');
        if (!hash) return false;
        const params = new URLSearchParams(hash);
        const encoded = params.get('diagram');
        if (params.get('fullscreen') === '1' || params.get('fs') === '1') {
            // Defer until after the initial render/fit so the layout is sized.
            requestAnimationFrame(() => requestAnimationFrame(() => {
                if (!this.root.classList.contains('is-fullscreen')) this.toggleFullscreen();
            }));
        }
        if (!encoded) return false;
        try {
            // Accept both standard and URL-safe base64.
            let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
            // Re-pad if URL-safe encoding stripped trailing '=' chars.
            const pad = b64.length % 4;
            if (pad) b64 += '='.repeat(4 - pad);
            const json = decodeURIComponent(escape(atob(b64)));
            this.loadConfig(JSON.parse(json));
            return true;
        } catch (err) {
            console.warn('Designer: failed to decode #diagram from URL', err);
            return false;
        }
    }

    // Replace the current state with a parsed rete config (same schema as
    // the {{< rete >}} shortcode body).
    loadConfig(cfg) {
        if (!cfg || typeof cfg !== 'object') return;
        state.groups = Array.isArray(cfg.groups) ? cfg.groups.map(g => ({ ...g })) : [];
        state.nodes = Array.isArray(cfg.nodes) ? cfg.nodes.map(n => ({ ...n })) : [];
        state.connections = Array.isArray(cfg.connections)
            ? cfg.connections.map(c => ({ ...c })) : [];
        state.selection = null;
        state.pending = null;
        // Re-derive nextId from existing IDs so newly added nodes don't clash.
        let max = 0;
        const collect = arr => arr.forEach(o => {
            const m = String(o.id || '').match(/-(\d+)$/);
            if (m) max = Math.max(max, parseInt(m[1], 10));
        });
        collect(state.nodes); collect(state.groups);
        state.nextId = max + 1;
        history.past.length = 0;
        history.future.length = 0;
    }

    // Reflect the Alt-key state on the root so CSS can show the “detach”
    // affordance and so the toolbar hint becomes visible.
    bindAltHint() {
        const update = (down) => {
            this.root.classList.toggle('is-alt', !!down);
        };
        window.addEventListener('keydown', e => { if (e.key === 'Alt') update(true); });
        window.addEventListener('keyup',   e => { if (e.key === 'Alt') update(false); });
        window.addEventListener('blur',    () => update(false));
    }

    // ------------------------------------------------------------------ UI

    buildPalette() {
        PALETTE_SECTIONS.forEach(section => {
            const heading = document.createElement('h3');
            heading.className = 'designer__palette-title';
            heading.dataset.section = section.title;
            heading.textContent = section.title;
            this.paletteEl.appendChild(heading);
            section.items.forEach(spec => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'designer__palette-item';
                const label = KIND_LABELS[spec.kind] || spec.kind;
                btn.dataset.search = [
                    label, spec.kind, spec.header, spec.title, spec.subtitle,
                    ...(spec.badges || []),
                ].filter(Boolean).join(' ').toLowerCase();
                btn.innerHTML = `
                    <span class="designer__palette-swatch rete-node--${spec.kind}"></span>
                    <span class="designer__palette-label">${label}</span>
                `;
                btn.addEventListener('click', () => this.addNodeFromSpec(spec));
                this.paletteEl.appendChild(btn);
            });
        });
        this.root.querySelector('[data-add-group]')
            ?.addEventListener('click', () => this.addGroup());

        const search = this.root.querySelector('[data-palette-search]');
        if (search) {
            search.addEventListener('input', () => this.filterPalette(search.value));
        }
    }

    filterPalette(query) {
        const q = (query || '').trim().toLowerCase();
        const items = this.paletteEl.querySelectorAll('.designer__palette-item');
        const visible = new Set();
        items.forEach(btn => {
            const match = !q || (btn.dataset.search || '').includes(q);
            btn.hidden = !match;
            if (match) {
                // Track which section this item belongs to (preceding heading).
                let prev = btn.previousElementSibling;
                while (prev && !prev.classList.contains('designer__palette-title')) {
                    prev = prev.previousElementSibling;
                }
                if (prev) visible.add(prev);
            }
        });
        this.paletteEl.querySelectorAll('.designer__palette-title').forEach(h => {
            h.hidden = q !== '' && !visible.has(h);
        });
    }

    bindToolbar() {
        this.root.querySelectorAll('.designer__btn[data-action]').forEach(btn => {
            btn.addEventListener('click', () => this.handleAction(btn.dataset.action, btn));
        });
        this.root.querySelectorAll('.designer__menu-item[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleAction(btn.dataset.action, btn);
                this.closeMenus();
            });
        });
        this.root.querySelectorAll('[data-menu-toggle]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const menu = btn.closest('[data-menu]');
                const list = menu?.querySelector('.designer__menu-list');
                if (!list) return;
                const open = !list.hidden;
                this.closeMenus();
                if (!open) {
                    list.hidden = false;
                    btn.setAttribute('aria-expanded', 'true');
                    menu.classList.add('is-open');
                }
            });
        });
        document.addEventListener('click', e => {
            if (!e.target.closest('[data-menu]')) this.closeMenus();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') this.closeMenus();
        });
        const inspectorToggle = this.root.querySelector('[data-action="toggle-inspector"]');
        if (inspectorToggle) {
            inspectorToggle.addEventListener('click', () => this.toggleInspector());
        }
    }

    closeMenus() {
        this.root.querySelectorAll('[data-menu]').forEach(menu => {
            menu.classList.remove('is-open');
            const list = menu.querySelector('.designer__menu-list');
            if (list) list.hidden = true;
            const toggle = menu.querySelector('[data-menu-toggle]');
            if (toggle) toggle.setAttribute('aria-expanded', 'false');
        });
    }

    toggleInspector(force) {
        const collapsed = typeof force === 'boolean'
            ? force
            : !this.root.classList.contains('is-inspector-collapsed');
        this.root.classList.toggle('is-inspector-collapsed', collapsed);
        const btn = this.root.querySelector('[data-action="toggle-inspector"]');
        if (btn) {
            btn.setAttribute('aria-expanded', String(!collapsed));
            btn.title = collapsed ? 'Expand properties panel' : 'Collapse properties panel';
            const label = btn.querySelector('.designer__inspector-toggle-label');
            if (label) label.textContent = collapsed ? 'Expand' : 'Collapse';
        }
        // Re-fit so the canvas uses the freed space.
        requestAnimationFrame(() => requestAnimationFrame(() => this.fit()));
    }

    handleAction(action, btn) {
        switch (action) {
            case 'fit':     this.fit(); break;
            case 'fullscreen': this.toggleFullscreen(); break;
            case 'undo':    this.undo(); break;
            case 'redo':    this.redo(); break;
            case 'clear':
                if (state.nodes.length || state.groups.length) {
                    if (!confirm('Remove all nodes, groups and connections?')) return;
                }
                this.pushHistory();
                state.groups = []; state.nodes = []; state.connections = [];
                state.selection = null;
                this.render();
                break;
            case 'copy':           this.copyShortcode(); break;
            case 'copy-shortcode': this.copyShortcode(); break;
            case 'copy-json':      this.copyJson(); break;
            case 'copy-url':       this.copyShareUrl(); break;
            case 'export':  this.exportPng(); break;
        }
    }

    // -------------------------------------------------------- Undo / Redo

    pushHistory() {
        const snap = snapshotState();
        if (history.past.length && history.past[history.past.length - 1] === snap) return;
        history.past.push(snap);
        if (history.past.length > history.limit) history.past.shift();
        history.future.length = 0;
        this.updateHistoryButtons();
    }

    undo() {
        if (!history.past.length) return;
        const current = snapshotState();
        const snap = history.past.pop();
        if (snap === current && history.past.length) {
            history.future.push(current);
            return this.undo();
        }
        history.future.push(current);
        restoreSnapshot(snap);
        this.render();
        this.updateHistoryButtons();
    }

    redo() {
        if (!history.future.length) return;
        const current = snapshotState();
        const snap = history.future.pop();
        history.past.push(current);
        restoreSnapshot(snap);
        this.render();
        this.updateHistoryButtons();
    }

    updateHistoryButtons() {
        const undoBtn = this.root.querySelector('.designer__btn[data-action="undo"]');
        const redoBtn = this.root.querySelector('.designer__btn[data-action="redo"]');
        if (undoBtn) undoBtn.disabled = history.past.length === 0;
        if (redoBtn) redoBtn.disabled = history.future.length === 0;
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
        // Reflect fullscreen state in the URL so a refresh keeps it.
        // Route through _writePersist so the diagram param keeps its
        // URL-safe (un-percent-encoded) form and we don't duplicate logic.
        if (this.lastConfig) this._pendingCfg = this.lastConfig;
        this._writePersist();
        // Two RAFs: one for layout to apply the new size, one to refit.
        requestAnimationFrame(() => requestAnimationFrame(() => this.fit()));
    }

    // ----------------------------------------------------------- CRUD ops

    addNodeFromSpec(spec) {
        this.pushHistory();
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
        this.pushHistory();
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
        this.pushHistory();
        const { type, id } = state.selection;
        if (type === 'node') {
            state.nodes = state.nodes.filter(n => n.id !== id);
            state.connections = state.connections.filter(c => c.from !== id && c.to !== id);
        } else if (type === 'group') {
            state.groups = state.groups.filter(g => g.id !== id);
            // Detach any nodes that were children of this group.
            state.nodes.forEach(n => { if (n.groupId === id) n.groupId = null; });
        } else if (type === 'connection') {
            state.connections.splice(id, 1); // id is index for connections
        }
        state.selection = null;
        this.render();
    }

    select(sel) {
        state.selection = sel;
        if (sel && this.root.classList.contains('is-inspector-collapsed')) {
            this.toggleInspector(false);
        }
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
        this.renderMinimap();
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
            const d = bezierPath(a.x, a.y, b.x, b.y, fromSide, toSide);

            // Invisible thick hit-area so clicks land reliably even on the
            // gaps of the flowing dashed stroke.
            const hit = document.createElementNS(SVG_NS, 'path');
            hit.setAttribute('d', d);
            hit.setAttribute('class', 'rete-connection-hit');
            hit.setAttribute('fill', 'none');
            hit.setAttribute('stroke', 'transparent');
            hit.setAttribute('stroke-width', '20');
            hit.style.pointerEvents = 'stroke';
            hit.style.cursor = 'pointer';
            hit.addEventListener('click', e => {
                e.stopPropagation();
                this.select({ type: 'connection', id: idx });
            });
            this.svg.appendChild(hit);

            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('d', d);
            const classes = ['rete-connection', `rete-connection--${c.kind || 'default'}`];
            if (c.label) classes.push('rete-connection--labelled');
            if (state.selection?.type === 'connection' && state.selection.id === idx) {
                classes.push('is-selected');
            }
            path.setAttribute('class', classes.join(' '));
            path.style.pointerEvents = 'none';
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
        this.anchorLayer.classList.toggle('is-connecting', !!state.pending);
        state.nodes.forEach(n => {
            ['top', 'right', 'bottom', 'left'].forEach(side => {
                const p = anchorPoint(n, side);
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'designer__anchor';
                dot.dataset.nodeId = n.id;
                if (state.pending && state.pending.nodeId === n.id && state.pending.side === side) {
                    dot.classList.add('designer__anchor--pending');
                }
                dot.style.left = p.x + 'px';
                dot.style.top  = p.y + 'px';
                dot.title = `Connect from ${n.id} · ${side}`;
                dot.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); });
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
        this.pushHistory();
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
        // Don't blow away the panel while the user is typing in one of its
        // inputs — re-rendering would steal focus on every keystroke.
        if (this.inspector.contains(document.activeElement)) return;
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
        const otherGroups = state.groups;
        const parent = n.groupId ? groupById(n.groupId) : null;
        const parentLabel = parent ? (parent.label || parent.id) : '—';
        const groupOptions = ['<option value="">(none)</option>']
            .concat(otherGroups.map(g =>
                `<option value="${escapeHtml(g.id)}"${g.id === n.groupId ? ' selected' : ''}>${escapeHtml(g.label || g.id)}</option>`
            )).join('');
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
            <div class="designer__field">
                <label>Parent group <span class="designer__field-hint">(hold Alt while dragging to detach)</span></label>
                <select data-field="groupId">${groupOptions}</select>
                <p class="designer__field-meta">Currently: <strong>${escapeHtml(parentLabel)}</strong></p>
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
            // Snapshot once when the user starts editing this field, so a
            // continuous edit collapses into a single undo step.
            input.addEventListener('focus', () => this.pushHistory());
            input.addEventListener('input', () => {
                const field = input.dataset.field;
                let value = input.value;
                if (field === 'w' || field === 'h') {
                    value = Math.max(40, parseInt(value, 10) || 0);
                } else if (field === 'badges') {
                    value = value.split(',').map(s => s.trim()).filter(Boolean);
                } else if (field === 'groupId') {
                    value = value || null;
                    target.groupId = value;
                    if (value && type === 'node') {
                        const g = groupById(value);
                        if (g) {
                            const c = clampToGroup(target, g);
                            target.x = c.x; target.y = c.y;
                        }
                    }
                    this.render();
                    return;
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
                if (n.groupId) out.groupId = n.groupId;
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
        this.lastConfig = cfg;
        this.lastShortcode =
            '{{< rete caption="My diagram" >}}\n' +
            JSON.stringify(cfg, null, 2) + '\n' +
            '{{< /rete >}}';
        if (this.sourceEl) this.sourceEl.textContent = this.lastShortcode;
        this.persistToUrl(cfg);
    }

    // Throttle live URL updates during drag/resize to one per animation
    // frame so we don't thrash history.replaceState on every mousemove.
    scheduleSource() {
        if (this._sourceRaf) return;
        this._sourceRaf = requestAnimationFrame(() => {
            this._sourceRaf = 0;
            this.renderSource();
            this.renderMinimap();
        });
    }

    // Mirror the current diagram into the URL fragment so an accidental
    // refresh restores the same state. Throttled because browsers (Chrome
    // in particular) rate-limit history.replaceState — around 100 calls
    // per 30s — so writing on every mousemove silently drops updates.
    persistToUrl(cfg) {
        this._pendingCfg = cfg;
        const now = Date.now();
        const since = now - (this._lastPersistAt || 0);
        if (since >= 250) {
            this._writePersist();
            return;
        }
        if (this._persistTimer) return;
        this._persistTimer = setTimeout(() => this._writePersist(), 250 - since);
        if (!this._unloadHooked) {
            this._unloadHooked = true;
            const flush = () => this._writePersist();
            window.addEventListener('beforeunload', flush);
            window.addEventListener('pagehide', flush);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') this._writePersist();
            });
        }
    }

    _writePersist() {
        clearTimeout(this._persistTimer);
        this._persistTimer = 0;
        this._lastPersistAt = Date.now();
        const cfg = this._pendingCfg;
        try {
            const existing = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
            existing.delete('diagram');
            existing.delete('fullscreen');
            existing.delete('fs');
            if (cfg) {
                const empty = !cfg.nodes.length && !cfg.groups.length && !cfg.connections.length;
                if (!empty) {
                    const json = JSON.stringify(cfg);
                    const b64 = btoa(unescape(encodeURIComponent(json)));
                    // URL-safe base64 so the value isn't percent-encoded.
                    const safe = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    existing.set('diagram', safe);
                }
            }
            // Always reflect the current fullscreen state.
            if (this.root && this.root.classList.contains('is-fullscreen')) {
                existing.set('fullscreen', '1');
            }
            // Build the hash manually so the diagram value stays un-encoded.
            const parts = [];
            existing.forEach((v, k) => {
                if (k === 'diagram') parts.push(`diagram=${v}`);
                else parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
            });
            const hash = parts.join('&');
            const base = window.location.pathname + window.location.search;
            try {
                history.replaceState(null, '', hash ? `${base}#${hash}` : base);
            } catch (e) {
                // Fallback if replaceState is throttled/unavailable.
                window.location.hash = hash;
            }
        } catch (err) {
            console.warn('Designer: persistToUrl failed', err);
        }
    }

    async copyShortcode() {
        await this.copyText(this.lastShortcode || '', 'Copied shortcode to clipboard.');
    }

    async copyJson() {
        const json = JSON.stringify(this.lastConfig || {}, null, 2);
        await this.copyText(json, 'Copied JSON to clipboard.');
    }

    async copyShareUrl() {
        const json = JSON.stringify(this.lastConfig || {});
        let b64;
        try {
            b64 = btoa(unescape(encodeURIComponent(json)));
        } catch {
            this.toast('Could not encode the diagram for sharing.');
            return;
        }
        const base = `${window.location.origin}${window.location.pathname}`;
        const params = new URLSearchParams();
        params.set('diagram', b64);
        // If the user is currently in fullscreen, the link will reopen in
        // fullscreen too.
        if (this.root.classList.contains('is-fullscreen')) {
            params.set('fullscreen', '1');
        }
        const url = `${base}#${params.toString()}`;
        await this.copyText(url, 'Copied share URL to clipboard.');
    }

    async copyText(text, successMsg) {
        try {
            await navigator.clipboard.writeText(text);
            this.toast(successMsg);
        } catch (err) {
            // Fallback for browsers without clipboard API.
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); this.toast(successMsg); }
            catch { this.toast('Copy failed — select the preview manually.'); }
            ta.remove();
        }
    }

    // Render the current diagram to a PNG and trigger a download. Uses
    // SVG <foreignObject> to embed a clone of the rendered HTML so node
    // styling matches what is on screen. External <img> badges are inlined
    // as data URIs so the resulting canvas is not tainted.
    async exportPng() {
        if (!state.nodes.length && !state.groups.length) {
            this.toast('Nothing to export — add some nodes first.');
            return;
        }
        this.toast('Exporting PNG…');
        try {
            const blob = await this.renderPngBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `architecture-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            this.toast('Exported diagram as PNG.');
        } catch (err) {
            console.error('Designer: PNG export failed', err);
            this.toast('Export failed — see console for details.');
        }
    }

    async renderPngBlob() {
        // Compute bounding box of all geometry, plus padding.
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        state.groups.forEach(g => {
            minX = Math.min(minX, g.x); minY = Math.min(minY, g.y);
            maxX = Math.max(maxX, g.x + g.w); maxY = Math.max(maxY, g.y + g.h);
        });
        state.nodes.forEach(n => {
            const w = n.w || 220, h = n.h || 120;
            minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + w); maxY = Math.max(maxY, n.y + h);
        });
        if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }
        const pad = 40;
        const ox = minX - pad, oy = minY - pad;
        const w = (maxX - minX) + pad * 2;
        const h = (maxY - minY) + pad * 2;
        const scale = 2; // 2x for crisp output

        // Clone the live viewport (groups + nodes) so styling matches.
        const viewportClone = this.viewport.cloneNode(true);
        // Strip designer-only chrome and the live connections <svg> from the
        // clone (we re-render connections as native SVG paths below, and
        // nesting an <svg> inside <foreignObject> often breaks the export).
        viewportClone.querySelectorAll(
            '.designer__resize, .designer__anchor, .designer__anchor-layer, svg.rete-connections'
        ).forEach(el => el.remove());
        viewportClone.querySelectorAll('.is-selected, .is-dragging').forEach(el => {
            el.classList.remove('is-selected');
            el.classList.remove('is-dragging');
        });
        // Reset the viewport transform so coordinates are absolute.
        viewportClone.style.transform = 'none';

        // Inline external <img> badges as data URIs (otherwise the canvas
        // becomes tainted and toBlob throws SecurityError).
        await Promise.all(Array.from(viewportClone.querySelectorAll('img')).map(async img => {
            try {
                const data = await fetchAsDataUri(img.src);
                if (data) img.src = data;
            } catch { /* leave as-is, may be skipped on render */ }
        }));

        // Inline page CSS so the foreignObject content renders correctly
        // when the SVG is loaded as a standalone image.
        const css = await collectStylesheets();
        // Inline all loaded webfonts as @font-face rules with data: URIs so
        // the standalone SVG can render text in the right typeface.
        const fontCss = await collectFontFaces();
        if (!fontCss) {
            console.warn('Designer: no @font-face rules were inlined; exported PNG will use fallback fonts.');
        } else {
            console.debug('Designer: inlined font CSS length =', fontCss.length, 'chars');
        }

        // Re-render connections at absolute coordinates for the export.
        const connectionsSvg = state.connections.map(c => {
            const from = nodeById(c.from), to = nodeById(c.to);
            if (!from || !to) return '';
            const fs = c.fromSide || 'right', ts = c.toSide || 'left';
            const a = anchorPoint(from, fs);
            const b = anchorPoint(to, ts);
            const d = bezierPath(a.x, a.y, b.x, b.y, fs, ts);
            const cls = `rete-connection rete-connection--${c.kind || 'default'}${c.label ? ' rete-connection--labelled' : ''}`;
            const path = `<path class="${cls}" d="${d}"></path>`;
            if (!c.label) return path;
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            let angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
            if (angle > 90) angle -= 180; if (angle < -90) angle += 180;
            return path +
                `<text class="rete-connection__label" x="${mx}" y="${my}" text-anchor="middle" transform="rotate(${angle} ${mx} ${my})">${escapeXml(c.label)}</text>`;
        }).join('');

        const serializer = new XMLSerializer();
        const innerHtml = serializer.serializeToString(viewportClone);

        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml"
     width="${w * scale}" height="${h * scale}" viewBox="${ox} ${oy} ${w} ${h}">
  <defs><style type="text/css"><![CDATA[
${fontCss}
${css}
  ]]></style></defs>
  <rect x="${ox}" y="${oy}" width="${w}" height="${h}" fill="#fafafa"/>
  <g class="rete-connections-export">${connectionsSvg}</g>
  <foreignObject x="${ox}" y="${oy}" width="${w}" height="${h}">
    <xhtml:div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${w}px;height:${h}px;">
      <xhtml:div xmlns="http://www.w3.org/1999/xhtml" style="position:absolute;left:${-ox}px;top:${-oy}px;">
        ${innerHtml}
      </xhtml:div>
    </xhtml:div>
  </foreignObject>
</svg>`;

        // Use a data URL rather than a blob URL: Chromium occasionally
        // refuses to rasterise <foreignObject> from blob: URLs.
        const svgBase64 = btoa(unescape(encodeURIComponent(svg)));
        const url = `data:image/svg+xml;base64,${svgBase64}`;
        let img;
        try {
            img = await loadImage(url);
        } catch (err) {
            console.warn('Designer: PNG export SVG (paste into a new tab to inspect):', svg);
            // Surface a more informative error: the failure is usually due
            // to invalid CSS or a cross-origin resource referenced from CSS.
            const e = new Error('SVG image failed to load (likely invalid embedded CSS or cross-origin reference). The full SVG was logged to the console.');
            e.cause = err;
            throw e;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w * scale;
        canvas.height = h * scale;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return await new Promise((resolve, reject) =>
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob returned null')), 'image/png'));
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
        this.renderMinimap();
    }

    // ---- Minimap --------------------------------------------------------
    buildMinimap() {
        const map = document.createElement('div');
        map.className = 'designer__minimap';
        map.title = 'Minimap — click or drag to pan';
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', 'designer__minimap-svg');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        map.appendChild(svg);
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'designer__minimap-toggle';
        toggle.title = 'Hide minimap';
        toggle.textContent = '\u2013';
        toggle.addEventListener('click', e => {
            e.stopPropagation();
            const collapsed = map.classList.toggle('is-collapsed');
            toggle.textContent = collapsed ? '\u25A1' : '\u2013';
            toggle.title = collapsed ? 'Show minimap' : 'Hide minimap';
            if (!collapsed) this.renderMinimap();
        });
        map.appendChild(toggle);
        this.canvas.appendChild(map);
        this.minimap = map;
        this.minimapSvg = svg;
        this.bindMinimapInput();
    }

    bindMinimapInput() {
        const map = this.minimap;
        // Click/drag on the minimap pans the main viewport so the chosen
        // canvas point lands at the centre of the visible area.
        const panTo = (clientX, clientY) => {
            if (!this._minimapBounds) return;
            const { minX, minY, w, h } = this._minimapBounds;
            const rect = map.getBoundingClientRect();
            const fx = (clientX - rect.left) / rect.width;
            const fy = (clientY - rect.top)  / rect.height;
            const cx = minX + fx * w;
            const cy = minY + fy * h;
            const canvasRect = this.canvas.getBoundingClientRect();
            this.tx = canvasRect.width  / 2 - cx * this.scale;
            this.ty = canvasRect.height / 2 - cy * this.scale;
            this.applyViewport();
        };
        let dragging = false;
        map.addEventListener('mousedown', e => {
            if (map.classList.contains('is-collapsed')) {
                map.classList.remove('is-collapsed');
                map.querySelector('.designer__minimap-toggle').textContent = '\u2013';
                this.renderMinimap();
                e.stopPropagation();
                return;
            }
            if (e.target.classList.contains('designer__minimap-toggle')) return;
            dragging = true;
            panTo(e.clientX, e.clientY);
            e.stopPropagation();
            e.preventDefault();
        });
        window.addEventListener('mousemove', e => {
            if (!dragging) return;
            panTo(e.clientX, e.clientY);
        });
        window.addEventListener('mouseup', () => { dragging = false; });
    }

    renderMinimap() {
        if (!this.minimapSvg || this.minimap.classList.contains('is-collapsed')) return;
        // World bounds: union of all geometry plus the current viewport so
        // the visible area is always represented even when empty.
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
        // Include the current viewport rect in world coordinates.
        const cRect = this.canvas.getBoundingClientRect();
        const vx = -this.tx / this.scale;
        const vy = -this.ty / this.scale;
        const vw = cRect.width / this.scale;
        const vh = cRect.height / this.scale;
        if (!isFinite(minX)) { minX = vx; minY = vy; maxX = vx + vw; maxY = vy + vh; }
        minX = Math.min(minX, vx);
        minY = Math.min(minY, vy);
        maxX = Math.max(maxX, vx + vw);
        maxY = Math.max(maxY, vy + vh);
        // Add a margin so things don't kiss the edge.
        const pad = 60;
        minX -= pad; minY -= pad; maxX += pad; maxY += pad;
        const w = maxX - minX, h = maxY - minY;
        this._minimapBounds = { minX, minY, w, h };
        const svg = this.minimapSvg;
        svg.setAttribute('viewBox', `${minX} ${minY} ${w} ${h}`);
        // Per-kind header colors that mirror --rete-node-color in CSS.
        const KIND_COLOR = {
            vault: '#555f8e', storage: '#6b7280', hub: '#84559f',
            agent: '#4a796b', factory: '#4a796b', camera: '#374151',
            amqp: '#b45309', turn: '#1d4ed8', mqtt: '#0f766e',
            default: '#6b7280',
        };
        // Build content.
        let html = '';
        state.groups.forEach(g => {
            html += `<rect class="designer__minimap-group" x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="6"/>`;
            if (g.label) {
                html += `<text class="designer__minimap-group-label" x="${g.x + 8}" y="${g.y + 16}">${escapeXml(g.label)}</text>`;
            }
        });
        state.nodes.forEach(n => {
            const nw = n.w || 220, nh = n.h || 120;
            const headerH = Math.max(14, Math.min(nh * 0.28, 28));
            const color = KIND_COLOR[n.kind] || KIND_COLOR.default;
            // Body card.
            html += `<rect class="designer__minimap-node-body" x="${n.x}" y="${n.y}" width="${nw}" height="${nh}" rx="6"/>`;
            // Colored header pill (top portion only, with rounded top corners
            // — the bottom corners stay flat against the body).
            html += `<path class="designer__minimap-node-header" fill="${color}" d="${roundedTopPath(n.x, n.y, nw, headerH, 6)}"/>`;
            // Title text inside the body.
            const title = n.title || n.header || '';
            if (title) {
                const ty = n.y + headerH + Math.max(14, (nh - headerH) / 2 + 4);
                html += `<text class="designer__minimap-node-title" x="${n.x + nw / 2}" y="${ty}" text-anchor="middle">${escapeXml(title)}</text>`;
            }
        });
        html += `<rect class="designer__minimap-viewport" x="${vx}" y="${vy}" width="${vw}" height="${vh}" rx="3"/>`;
        svg.innerHTML = html;
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
        // Group-edge hit zone: if the user clicks within ~12 canvas-units of
        // a group's perimeter, prefer selecting the group even when a child
        // node sits on top. Runs in the capture phase so it intercepts the
        // node's own mousedown handler.
        this.viewport.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            if (e.target.closest('.designer__resize, .designer__anchor, .rete-connection, .rete-connection-hit, .rete-group__label')) return;
            // Convert client coords to canvas-units.
            const rect = this.canvas.getBoundingClientRect();
            const cx = (e.clientX - rect.left - this.tx) / this.scale;
            const cy = (e.clientY - rect.top  - this.ty) / this.scale;
            const EDGE = 12;
            const matches = state.groups.filter(g => {
                const inOuter = cx >= g.x - EDGE && cx <= g.x + g.w + EDGE &&
                                cy >= g.y - EDGE && cy <= g.y + g.h + EDGE;
                if (!inOuter) return false;
                const inInner = cx > g.x + EDGE && cx < g.x + g.w - EDGE &&
                                cy > g.y + EDGE && cy < g.y + g.h - EDGE;
                return !inInner; // only the rim counts
            });
            if (!matches.length) return;
            // Smallest matching group wins (most specific).
            matches.sort((a, b) => (a.w * a.h) - (b.w * b.h));
            this.select({ type: 'group', id: matches[0].id });
            e.stopPropagation();
            e.preventDefault();
        }, true);

        // Pan + click-to-deselect.
        let panning = false, sx = 0, sy = 0, otx = 0, oty = 0, moved = false;
        this.canvas.addEventListener('mousedown', e => {
            if (e.target.closest('.rete-node, .rete-group, .designer__anchor, .rete-connection, .rete-connection-hit')) return;
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
        let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false, snapped = false;
        let altUsed = false;
        el.addEventListener('mousedown', e => {
            dragging = true; moved = false; snapped = false; altUsed = false;
            sx = e.clientX; sy = e.clientY; ox = n.x; oy = n.y;
            el.classList.add('is-dragging');
            e.stopPropagation();
            e.preventDefault();
        });
        window.addEventListener('mousemove', e => {
            if (!dragging) return;
            const dx = (e.clientX - sx) / this.scale;
            const dy = (e.clientY - sy) / this.scale;
            if (Math.abs(dx) + Math.abs(dy) > 2 && !moved) {
                moved = true;
                if (!snapped) { this.pushHistory(); snapped = true; }
            }
            // Snap to grid for clean alignment; Shift disables snapping.
            if (e.shiftKey) {
                n.x = Math.round(ox + dx);
                n.y = Math.round(oy + dy);
            } else {
                n.x = snap(ox + dx);
                n.y = snap(oy + dy);
            }
            // Constrain to parent group unless the user is holding Alt to
            // “decouple” the node mid-drag.
            if (e.altKey) altUsed = true;
            if (n.groupId && !e.altKey) {
                const g = groupById(n.groupId);
                if (g) {
                    const c = clampToGroup(n, g);
                    n.x = c.x; n.y = c.y;
                }
            }
            el.style.transform = `translate(${n.x}px, ${n.y}px)`;
            this.renderConnections();
            this.renderAnchors();
            this.scheduleSource();
        });
        window.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            el.classList.remove('is-dragging');
            if (!moved) {
                this.select({ type: 'node', id: n.id });
                return;
            }
            // Resolve coupling on drop.
            if (n.groupId) {
                const g = groupById(n.groupId);
                if (g) {
                    const inside = containingGroup(n);
                    if (altUsed && inside?.id !== g.id) {
                        // Dragged out of its parent while Alt-held → detach.
                        n.groupId = inside ? inside.id : null;
                    } else if (!inside) {
                        // Safety net (shouldn't happen because of clamp).
                        const c = clampToGroup(n, g);
                        n.x = c.x; n.y = c.y;
                    }
                } else {
                    n.groupId = null;
                }
            } else {
                // Free node — auto-couple if dropped fully inside a group.
                const inside = containingGroup(n);
                if (inside) n.groupId = inside.id;
            }
            // Re-render so inspector / coupling outline updates.
            this.render();
        });
    }

    attachGroupHandlers(g, el) {
        // Resize handles take precedence over drag.
        el.querySelectorAll('.designer__resize').forEach(h => {
            this.attachResizeHandle(g, el, h, h.dataset.dir);
        });

        let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false, snapped = false;
        let childOffsets = [];
        el.addEventListener('mousedown', e => {
            // Resize handles handle their own mousedown.
            if (e.target.classList.contains('designer__resize')) return;
            // Only drag when the click is on the group's own surface, not on a child node.
            if (e.target !== el && !e.target.classList.contains('rete-group__label')) return;
            dragging = true; moved = false; snapped = false;
            sx = e.clientX; sy = e.clientY; ox = g.x; oy = g.y;
            // Capture positions of every node that should move with the
            // group: explicitly coupled children plus any free node whose
            // rectangle is fully inside the group at drag start.
            childOffsets = state.nodes
                .filter(n => n.groupId === g.id || (
                    !n.groupId &&
                    n.x >= g.x && n.y >= g.y &&
                    n.x + (n.w || 220) <= g.x + g.w &&
                    n.y + (n.h || 120) <= g.y + g.h
                ))
                .map(n => ({ node: n, ox: n.x, oy: n.y }));
            e.stopPropagation();
            e.preventDefault();
        });
        window.addEventListener('mousemove', e => {
            if (!dragging) return;
            const dx = (e.clientX - sx) / this.scale;
            const dy = (e.clientY - sy) / this.scale;
            if (Math.abs(dx) + Math.abs(dy) > 2 && !moved) {
                moved = true;
                if (!snapped) { this.pushHistory(); snapped = true; }
            }
            // Snap the group origin to the grid; children move by the same
            // snapped delta so their relative offsets are preserved.
            const useSnap = !e.shiftKey;
            const nx = useSnap ? snap(ox + dx) : Math.round(ox + dx);
            const ny = useSnap ? snap(oy + dy) : Math.round(oy + dy);
            const sdx = nx - ox;
            const sdy = ny - oy;
            g.x = nx;
            g.y = ny;
            el.style.transform = `translate(${g.x}px, ${g.y}px)`;
            childOffsets.forEach(({ node, ox: nox, oy: noy }) => {
                node.x = Math.round(nox + sdx);
                node.y = Math.round(noy + sdy);
                const childEl = this.nodeEls.get(node.id);
                if (childEl) childEl.style.transform = `translate(${node.x}px, ${node.y}px)`;
            });
            this.renderConnections();
            this.scheduleSource();
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

    // Drag a single resize handle on a group. `dir` is one of
    // nw, n, ne, e, se, s, sw, w.
    attachResizeHandle(g, el, handle, dir) {
        const MIN_W = 80, MIN_H = 60;
        let dragging = false;
        let sx = 0, sy = 0;
        let ox = 0, oy = 0, ow = 0, oh = 0;
        let snapped = false;
        const setEl = () => {
            el.style.transform = `translate(${g.x}px, ${g.y}px)`;
            el.style.width  = g.w + 'px';
            el.style.height = g.h + 'px';
        };
        handle.addEventListener('mousedown', e => {
            dragging = true; snapped = false;
            sx = e.clientX; sy = e.clientY;
            ox = g.x; oy = g.y; ow = g.w; oh = g.h;
            this.select({ type: 'group', id: g.id });
            e.stopPropagation();
            e.preventDefault();
        });
        window.addEventListener('mousemove', e => {
            if (!dragging) return;
            if (!snapped) { this.pushHistory(); snapped = true; }
            const dx = (e.clientX - sx) / this.scale;
            const dy = (e.clientY - sy) / this.scale;
            let nx = ox, ny = oy, nw = ow, nh = oh;
            if (dir.includes('e')) nw = Math.max(MIN_W, ow + dx);
            if (dir.includes('s')) nh = Math.max(MIN_H, oh + dy);
            if (dir.includes('w')) {
                nw = Math.max(MIN_W, ow - dx);
                nx = ox + (ow - nw);
            }
            if (dir.includes('n')) {
                nh = Math.max(MIN_H, oh - dy);
                ny = oy + (oh - nh);
            }
            // Snap to grid for clean alignment; Shift disables snapping.
            if (!e.shiftKey) {
                if (dir.includes('e')) nw = Math.max(MIN_W, snap(nw));
                if (dir.includes('s')) nh = Math.max(MIN_H, snap(nh));
                if (dir.includes('w')) {
                    const snappedX = snap(nx);
                    nw = Math.max(MIN_W, ow + (ox - snappedX));
                    nx = snappedX;
                }
                if (dir.includes('n')) {
                    const snappedY = snap(ny);
                    nh = Math.max(MIN_H, oh + (oy - snappedY));
                    ny = snappedY;
                }
            }
            g.x = Math.round(nx); g.y = Math.round(ny);
            g.w = Math.round(nw); g.h = Math.round(nh);
            setEl();
            // Re-clamp coupled children so they stay inside the new bounds.
            state.nodes.forEach(n => {
                if (n.groupId !== g.id) return;
                const c = clampToGroup(n, g);
                n.x = c.x; n.y = c.y;
                const childEl = this.nodeEls.get(n.id);
                if (childEl) childEl.style.transform = `translate(${n.x}px, ${n.y}px)`;
            });
            this.renderConnections();
            this.scheduleSource();
        });
        window.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            this.renderSource();
            this.renderInspector();
        });
    }

    bindKeyboard() {
        window.addEventListener('keydown', e => {
            // Ignore typing inside the inspector / palette inputs.
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            const mod = e.ctrlKey || e.metaKey;
            if (mod && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                if (e.shiftKey) this.redo(); else this.undo();
                return;
            }
            if (mod && (e.key === 'y' || e.key === 'Y')) {
                e.preventDefault();
                this.redo();
                return;
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (state.selection) {
                    e.preventDefault();
                    this.deleteSelection();
                }
            } else if (e.key === 'Escape') {
                if (state.pending) {
                    state.pending = null;
                    this.renderAnchors();
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

function escapeXml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Build an SVG path describing a rectangle with only its top corners rounded.
// Used by the minimap to draw the colored header pill on each miniature node.
function roundedTopPath(x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h));
    return `M${x + rr} ${y}` +
           `H${x + w - rr}` +
           `Q${x + w} ${y} ${x + w} ${y + rr}` +
           `V${y + h}` +
           `H${x}` +
           `V${y + rr}` +
           `Q${x} ${y} ${x + rr} ${y}` +
           `Z`;
}

// Load a same-origin (or CORS-enabled) URL and return a `data:` URI for it.
// Used during PNG export to inline <img> badges so the canvas isn't tainted.
async function fetchAsDataUri(url) {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
    });
}

// Collect all same-origin stylesheet rules into a single CSS string. External
// or cross-origin stylesheets (which raise SecurityError on cssRules) are
// skipped. Used so the SVG export carries the styles needed to render the
// nodes inside <foreignObject>.
async function collectStylesheets() {
    const parts = [];
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            const rules = sheet.cssRules;
            if (!rules) continue;
            for (const rule of Array.from(rules)) {
                const text = rule.cssText;
                // CSS containing a literal `]]>` would terminate the CDATA
                // block we emit it inside; defensively split it apart.
                parts.push(text.replace(/]]>/g, ']]]]><![CDATA[>'));
            }
        } catch { /* cross-origin: skip */ }
    }
    return parts.join('\n');
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// Walk all CSS rules in same-origin stylesheets, find every @font-face rule,
// fetch its `src: url(...)` resource, and emit a new @font-face rule with the
// font binary inlined as a base64 data URI. This lets a standalone SVG render
// text in the same typeface as the live page (otherwise the font is missing
// in the SVG image context and falls back to a system default).
//
// To stay fast: only collect families actually referenced by the document
// and only the Latin subset — everything else is wasted bandwidth for our
// English-only diagram text.
const FONT_FAMILIES_OF_INTEREST = ['inter', 'outfit'];

function isLatinSubset(unicodeRange) {
    if (!unicodeRange) return true; // no range = covers everything = keep it
    // Heuristic: Google Fonts marks the Latin subset with U+0000-00FF.
    return /U\+0000-00FF|U\+0020-00FF|U\+0000-007F|U\+0020-007F/i.test(unicodeRange);
}

async function collectFontFaces() {
    const candidates = []; // { family, weight, style, url, fmt }
    const pushCandidate = (family, weight, style, src, baseHref, unicodeRange) => {
        if (!family || !src) return;
        const fam = family.replace(/['"]/g, '').trim().toLowerCase();
        if (!FONT_FAMILIES_OF_INTEREST.some(f => fam.includes(f))) return;
        if (!isLatinSubset(unicodeRange)) return;
        const m = src.match(/url\(\s*(['"]?)([^'")]+)\1\s*\)(?:\s*format\(\s*(['"]?)([^'")]+)\3\s*\))?/);
        if (!m) return;
        const url = new URL(m[2], baseHref || document.baseURI).href;
        candidates.push({ family: family.trim(), weight, style, url, fmt: m[4] });
    };

    // 1. Same-origin sheets: walk parsed cssRules.
    for (const sheet of Array.from(document.styleSheets)) {
        let cssRules;
        try { cssRules = sheet.cssRules; } catch { cssRules = null; }
        if (cssRules) {
            for (const rule of Array.from(cssRules)) {
                if (rule.type !== 5) continue; // CSSRule.FONT_FACE_RULE
                pushCandidate(
                    rule.style.getPropertyValue('font-family'),
                    rule.style.getPropertyValue('font-weight') || 'normal',
                    rule.style.getPropertyValue('font-style')  || 'normal',
                    rule.style.getPropertyValue('src'),
                    sheet.href,
                    rule.style.getPropertyValue('unicode-range'),
                );
            }
            continue;
        }
        // 2. Cross-origin sheets (e.g. Google Fonts): fetch the CSS text and
        //    regex out @font-face blocks. Google serves these with permissive
        //    CORS so this works in browsers.
        if (!sheet.href) continue;
        let cssText;
        try {
            const res = await fetch(sheet.href);
            if (!res.ok) continue;
            cssText = await res.text();
        } catch { continue; }
        const faceRe = /@font-face\s*\{([^}]+)\}/g;
        let m;
        while ((m = faceRe.exec(cssText))) {
            const body = m[1];
            const get = re => { const x = body.match(re); return x ? x[1].trim() : ''; };
            pushCandidate(
                get(/font-family\s*:\s*([^;]+);/i),
                get(/font-weight\s*:\s*([^;]+);/i) || 'normal',
                get(/font-style\s*:\s*([^;]+);/i)  || 'normal',
                get(/src\s*:\s*([^;]+);/i),
                sheet.href,
                get(/unicode-range\s*:\s*([^;]+);/i),
            );
        }
    }

    // De-dupe and fetch all binaries in parallel.
    const seen = new Set();
    const unique = candidates.filter(c => {
        const k = `${c.family}|${c.weight}|${c.style}|${c.url}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
    const results = await Promise.all(unique.map(async c => {
        try {
            const dataUri = await fetchAsDataUri(c.url);
            if (!dataUri) return null;
            const formatPart = c.fmt ? ` format('${c.fmt}')` : '';
            return `@font-face { font-family: ${c.family}; font-style: ${c.style}; ` +
                `font-weight: ${c.weight}; src: url('${dataUri}')${formatPart}; }`;
        } catch { return null; }
    }));
    return results.filter(Boolean).join('\n');
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
