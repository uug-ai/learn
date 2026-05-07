/*
 * Architecture diagram renderer.
 *
 * Originally prototyped on rete.js, but we use none of rete's graph features
 * (no engine, no validated connections, no sockets) — just positioned cards
 * with bezier connectors. Pulling rete + a render plugin in via esm.sh
 * triggered `instanceof Scope` mismatches and empty node DOM. Replaced with a
 * ~200 LOC vanilla implementation: no external runtime deps, no import map.
 *
 * Each `<div class="rete-diagram" data-rete-config="...">` element is hydrated
 * with a draggable / pan- and zoom-able canvas built from the JSON config:
 *
 *   {
 *     "groups":      [ { "id": "edge", "label": "Edge", "x": 0, "y": 0, "w": 320, "h": 460 } ],
 *     "nodes":       [ { "id": "src",  "label": "...", "kind": "source",
 *                         "x": 540, "y": 110, "w": 252, "h": 120,
 *                         "header": "VAULT SOURCE", "title": "Forwarder",
 *                         "subtitle": "..." } ],
 *     "connections": [ { "from": "src", "to": "sink1",
 *                         "fromSide": "right", "toSide": "left",
 *                         "kind": "thick" } ]
 *   }
 *
 * The class name is kept as `.rete-diagram` for backward compatibility with
 * the existing CSS and shortcode.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function createNodeEl(n) {
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
    el.appendChild(body);
    return el;
}

function createGroupEl(g) {
    const el = document.createElement('div');
    el.className = 'rete-group';
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = '0';
    el.style.width = g.w + 'px';
    el.style.height = g.h + 'px';
    el.style.transform = `translate(${g.x}px, ${g.y}px)`;
    if (g.label) {
        const label = document.createElement('div');
        label.className = 'rete-group__label';
        label.textContent = g.label;
        el.appendChild(label);
    }
    return el;
}

function bezierPath(x1, y1, x2, y2) {
    const dx = Math.max(40, Math.abs(x2 - x1) * 0.4);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

function anchorPoint(node, side) {
    const w = node.w || 220;
    const h = node.h || 120;
    switch (side) {
        case 'left':   return { x: node.x,         y: node.y + h / 2 };
        case 'right':  return { x: node.x + w,     y: node.y + h / 2 };
        case 'top':    return { x: node.x + w / 2, y: node.y };
        case 'bottom': return { x: node.x + w / 2, y: node.y + h };
        default:       return { x: node.x + w / 2, y: node.y + h / 2 };
    }
}

function init(container) {
    let config;
    try {
        config = JSON.parse(container.dataset.reteConfig);
    } catch (err) {
        console.error('[rete-diagram] invalid config', err, container);
        return;
    }
    container.classList.add('rete-diagram--ready');
    container.innerHTML = '';

    // Layered structure (all transformed together by the viewport):
    //   viewport
    //     ├─ groups     (background rectangles, non-interactive)
    //     ├─ svg        (connection paths)
    //     └─ nodes      (draggable cards on top)
    const viewport = document.createElement('div');
    viewport.className = 'rete-viewport';
    viewport.style.position = 'absolute';
    viewport.style.left = '0';
    viewport.style.top = '0';
    viewport.style.transformOrigin = '0 0';
    container.appendChild(viewport);

    const groupLayer = document.createElement('div');
    groupLayer.className = 'rete-group-layer';
    groupLayer.style.position = 'absolute';
    groupLayer.style.inset = '0';
    groupLayer.style.pointerEvents = 'none';
    viewport.appendChild(groupLayer);

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'rete-connections');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.overflow = 'visible';
    svg.style.pointerEvents = 'none';
    viewport.appendChild(svg);

    const nodeLayer = document.createElement('div');
    nodeLayer.className = 'rete-node-layer';
    nodeLayer.style.position = 'absolute';
    nodeLayer.style.inset = '0';
    viewport.appendChild(nodeLayer);

    // Toolbar (fullscreen toggle). Sits above the viewport, fixed in container
    // coords so it stays put when panning/zooming.
    const toolbar = document.createElement('div');
    toolbar.className = 'rete-toolbar';
    const fsBtn = document.createElement('button');
    fsBtn.type = 'button';
    fsBtn.className = 'rete-toolbar__btn';
    fsBtn.setAttribute('aria-label', 'Toggle fullscreen');
    fsBtn.title = 'Toggle fullscreen';
    const ICON_EXPAND  = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/></svg>';
    const ICON_COLLAPSE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4"/><path d="M15 4v5h5"/><path d="M9 20v-5H4"/><path d="M15 20v-5h5"/></svg>';
    fsBtn.innerHTML = ICON_EXPAND;
    toolbar.appendChild(fsBtn);
    container.appendChild(toolbar);

    // Build groups.
    (config.groups || []).forEach(g => groupLayer.appendChild(createGroupEl(g)));

    // Build nodes; remember each node's element so we can update its transform.
    const nodes = (config.nodes || []).map(n => ({ ...n }));
    const nodeEls = new Map();
    nodes.forEach(n => {
        const el = createNodeEl(n);
        nodeLayer.appendChild(el);
        nodeEls.set(n.id, el);
    });
    const nodeById = new Map(nodes.map(n => [n.id, n]));

    // Assign each node to the group that contains it at init time. Drag is
    // then clamped to that group's bounds so a node can't escape its group.
    const groups = config.groups || [];
    function findGroupFor(n) {
        const w = n.w || 220, h = n.h || 120;
        const cx = n.x + w / 2, cy = n.y + h / 2;
        return groups.find(g =>
            cx >= g.x && cx <= g.x + g.w &&
            cy >= g.y && cy <= g.y + g.h
        ) || null;
    }
    nodes.forEach(n => { n._group = findGroupFor(n); });

    function redraw() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        (config.groups || []).forEach(g => {
            minX = Math.min(minX, g.x); minY = Math.min(minY, g.y);
            maxX = Math.max(maxX, g.x + g.w); maxY = Math.max(maxY, g.y + g.h);
        });
        nodes.forEach(n => {
            minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + (n.w || 220));
            maxY = Math.max(maxY, n.y + (n.h || 120));
        });
        if (!isFinite(minX)) return;
        const pad = 40;
        svg.setAttribute('viewBox',
            `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`);
        svg.style.left   = (minX - pad) + 'px';
        svg.style.top    = (minY - pad) + 'px';
        svg.style.width  = (maxX - minX + pad * 2) + 'px';
        svg.style.height = (maxY - minY + pad * 2) + 'px';

        svg.innerHTML = '';
        (config.connections || []).forEach(c => {
            const from = nodeById.get(c.from);
            const to   = nodeById.get(c.to);
            if (!from || !to) return;
            const a = anchorPoint(from, c.fromSide || 'right');
            const b = anchorPoint(to,   c.toSide   || 'left');
            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('d', bezierPath(a.x, a.y, b.x, b.y));
            path.setAttribute('class', `rete-connection rete-connection--${c.kind || 'default'}`);
            svg.appendChild(path);

            if (c.label) {
                // Midpoint of the cubic bezier (t=0.5 with our symmetric control points).
                const dx = Math.max(40, Math.abs(b.x - a.x) * 0.4);
                const mx = 0.125 * a.x + 0.375 * (a.x + dx) + 0.375 * (b.x - dx) + 0.125 * b.x;
                const my = 0.125 * a.y + 0.375 * a.y         + 0.375 * b.y         + 0.125 * b.y;
                const text = document.createElementNS(SVG_NS, 'text');
                text.setAttribute('x', mx);
                text.setAttribute('y', my);
                text.setAttribute('class', 'rete-connection__label');
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'middle');
                text.textContent = c.label;
                svg.appendChild(text);
            }
        });
    }

    // Pan + zoom state (applied as a single transform on the viewport).
    let scale = 1, tx = 0, ty = 0;
    function applyViewport() {
        viewport.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }

    // Center initial viewport so the content fits within the container.
    function fit() {
        const rect = container.getBoundingClientRect();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        (config.groups || []).forEach(g => {
            minX = Math.min(minX, g.x); minY = Math.min(minY, g.y);
            maxX = Math.max(maxX, g.x + g.w); maxY = Math.max(maxY, g.y + g.h);
        });
        nodes.forEach(n => {
            minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + (n.w || 220));
            maxY = Math.max(maxY, n.y + (n.h || 120));
        });
        if (!isFinite(minX) || rect.width === 0 || rect.height === 0) {
            applyViewport();
            return;
        }
        const cw = maxX - minX, ch = maxY - minY;
        const margin = 40;
        scale = Math.min(
            (rect.width - margin * 2) / cw,
            (rect.height - margin * 2) / ch,
            1.2
        );
        if (!isFinite(scale) || scale <= 0) scale = 1;
        tx = (rect.width  - cw * scale) / 2 - minX * scale;
        ty = (rect.height - ch * scale) / 2 - minY * scale;
        applyViewport();
    }

    // --- Pan: drag on empty container background.
    let panning = false, panStartX = 0, panStartY = 0, panStartTx = 0, panStartTy = 0;
    container.addEventListener('mousedown', e => {
        if (e.target.closest('.rete-node')) return; // node drag handles itself
        panning = true;
        panStartX = e.clientX; panStartY = e.clientY;
        panStartTx = tx; panStartTy = ty;
        container.style.cursor = 'grabbing';
        e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
        if (!panning) return;
        tx = panStartTx + (e.clientX - panStartX);
        ty = panStartTy + (e.clientY - panStartY);
        applyViewport();
    });
    window.addEventListener('mouseup', () => {
        if (!panning) return;
        panning = false;
        container.style.cursor = '';
    });

    // --- Zoom: wheel, anchored at cursor.
    container.addEventListener('wheel', e => {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const factor = Math.exp(-e.deltaY * 0.0015);
        const next = Math.max(0.2, Math.min(4, scale * factor));
        // Keep the point under the cursor stationary in canvas space.
        tx = cx - (cx - tx) * (next / scale);
        ty = cy - (cy - ty) * (next / scale);
        scale = next;
        applyViewport();
    }, { passive: false });

    // --- Per-node drag (translates the node within the viewport's coordinate
    // space; divide screen delta by scale to compensate for zoom).
    nodes.forEach(n => {
        const el = nodeEls.get(n.id);
        let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
        el.addEventListener('mousedown', e => {
            dragging = true;
            sx = e.clientX; sy = e.clientY;
            ox = n.x; oy = n.y;
            el.classList.add('is-dragging');
            e.stopPropagation(); // don't trigger pan
            e.preventDefault();
        });
        window.addEventListener('mousemove', e => {
            if (!dragging) return;
            let nx = ox + (e.clientX - sx) / scale;
            let ny = oy + (e.clientY - sy) / scale;
            // Clamp to group bounds if the node belongs to one.
            const g = n._group;
            if (g) {
                const w = n.w || 220, h = n.h || 120;
                nx = Math.max(g.x, Math.min(nx, g.x + g.w - w));
                ny = Math.max(g.y, Math.min(ny, g.y + g.h - h));
            }
            n.x = nx;
            n.y = ny;
            el.style.transform = `translate(${n.x}px, ${n.y}px)`;
            redraw();
        });
        window.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            el.classList.remove('is-dragging');
        });
    });

    redraw();
    // Defer fit until after layout settles (container may have 0 width on first paint).
    requestAnimationFrame(fit);
    window.addEventListener('resize', fit);

    // --- Fullscreen toggle (window-level only). We deliberately don't use
    // the native Fullscreen API: it takes over the whole OS screen and breaks
    // out of the docs reading flow. Instead we toggle a class that pins the
    // container to fill the browser viewport.
    function isFullscreen() {
        return container.classList.contains('rete-diagram--pseudo-fullscreen');
    }
    function syncFsIcon() {
        fsBtn.innerHTML = isFullscreen() ? ICON_COLLAPSE : ICON_EXPAND;
        fsBtn.title = isFullscreen() ? 'Exit fullscreen' : 'Toggle fullscreen';
    }
    function setFullscreen(on) {
        container.classList.toggle('rete-diagram--pseudo-fullscreen', on);
        document.body.classList.toggle('rete-diagram-fs-lock', on);
        // Two RAFs: one to apply the new size, one to measure + refit.
        requestAnimationFrame(() => requestAnimationFrame(() => { fit(); syncFsIcon(); }));
    }
    fsBtn.addEventListener('click', e => {
        e.stopPropagation();
        setFullscreen(!isFullscreen());
    });
    // Double-click on the canvas background (not on a node) toggles fullscreen.
    container.addEventListener('dblclick', e => {
        if (e.target.closest('.rete-node, .rete-toolbar')) return;
        setFullscreen(!isFullscreen());
    });
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape' && isFullscreen()) setFullscreen(false);
    });
}

function bootstrap() {
    document.querySelectorAll('.rete-diagram:not(.rete-diagram--ready)').forEach(init);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
