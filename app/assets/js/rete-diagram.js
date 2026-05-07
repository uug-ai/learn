/*
 * Rete-powered architecture diagram renderer.
 *
 * Each `<div class="rete-diagram" data-rete-config="...">` element on the page
 * is hydrated into a draggable / pan- and zoom-able node graph using rete.js v2
 * (data model + area plugin) and a small custom DOM/SVG renderer.
 *
 * Config schema (JSON, embedded in `data-rete-config`):
 *   {
 *     "groups": [ { "id": "edge", "label": "Edge", "x": 0, "y": 0, "w": 320, "h": 460 } ],
 *     "nodes":  [ { "id": "src", "label": "VAULT SOURCE", "kind": "source",
 *                    "x": 540, "y": 110, "w": 252, "h": 120,
 *                    "header": "VAULT SOURCE", "title": "Forwarder" } ],
 *     "connections": [ { "from": "src", "to": "sink1" } ]
 *   }
 *
 * The renderer is intentionally minimal: it leans on rete's NodeEditor /
 * ClassicPreset for the data model and the AreaPlugin for the canvas
 * (pan, zoom, node dragging) but draws nodes and connections with hand-rolled
 * DOM + SVG rather than pulling in the React/Vue render plugins. This keeps
 * the bundle small (~25 kB gz) and avoids a framework dependency in the docs
 * site.
 */

import { NodeEditor, ClassicPreset } from 'https://esm.sh/rete@2.0.5';
import { AreaPlugin, AreaExtensions } from 'https://esm.sh/rete-area-plugin@2.1.5';

class DiagramNode extends ClassicPreset.Node {
    constructor(data) {
        super(data.label || data.id);
        this.data = data;
        this.width = data.w || 220;
        this.height = data.h || 120;
    }
}

function renderNodeDom(node) {
    const el = document.createElement('div');
    el.className = `rete-node rete-node--${node.data.kind || 'default'}`;
    el.style.width = node.width + 'px';
    el.style.height = node.height + 'px';

    if (node.data.header) {
        const header = document.createElement('div');
        header.className = 'rete-node__header';
        header.textContent = node.data.header;
        el.appendChild(header);
    }

    const body = document.createElement('div');
    body.className = 'rete-node__body';

    if (node.data.title) {
        const title = document.createElement('div');
        title.className = 'rete-node__title';
        title.textContent = node.data.title;
        body.appendChild(title);
    }
    if (node.data.subtitle) {
        const sub = document.createElement('div');
        sub.className = 'rete-node__subtitle';
        sub.textContent = node.data.subtitle;
        body.appendChild(sub);
    }
    el.appendChild(body);
    return el;
}

function renderGroupDom(group) {
    const el = document.createElement('div');
    el.className = 'rete-group';
    el.style.width = group.w + 'px';
    el.style.height = group.h + 'px';
    if (group.label) {
        const label = document.createElement('div');
        label.className = 'rete-group__label';
        label.textContent = group.label;
        el.appendChild(label);
    }
    return el;
}

function ensureSvgLayer(container) {
    let svg = container.querySelector('svg.rete-connections');
    if (svg) return svg;
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'rete-connections');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // Place the SVG inside the area's content holder so it pans/zooms with nodes.
    const holder = container.querySelector('.rete-area, [data-area]') || container;
    holder.insertBefore(svg, holder.firstChild);
    return svg;
}

function buildPath(x1, y1, x2, y2) {
    const dx = Math.max(40, Math.abs(x2 - x1) * 0.4);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

async function init(container) {
    let config;
    try {
        config = JSON.parse(container.dataset.reteConfig);
    } catch (err) {
        console.error('[rete-diagram] invalid config', err, container);
        return;
    }

    container.classList.add('rete-diagram--ready');

    const editor = new NodeEditor();
    const area = new AreaPlugin(container);

    AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
        accumulating: AreaExtensions.accumulateOnCtrl()
    });

    editor.use(area);

    // Locate the area's content holder so we can inject groups + connections SVG
    // beneath the node layer.
    const holder = container.querySelector('div'); // area plugin creates a wrapping div
    const groupLayer = document.createElement('div');
    groupLayer.className = 'rete-group-layer';
    holder.insertBefore(groupLayer, holder.firstChild);

    // Render group rectangles (purely decorative, not part of the rete graph).
    (config.groups || []).forEach(g => {
        const el = renderGroupDom(g);
        el.style.transform = `translate(${g.x}px, ${g.y}px)`;
        el.dataset.groupId = g.id;
        groupLayer.appendChild(el);
    });

    // Connections SVG layer (under the node layer, above the group layer).
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'rete-connections');
    holder.insertBefore(svg, groupLayer.nextSibling);

    // Custom DOM rendering hook: replace the empty node element the area plugin
    // creates with our own card markup.
    area.addPipe(ctx => {
        if (ctx.type === 'rendernode') {
            const view = area.nodeViews.get(ctx.data.node.id);
            if (view && view.element && !view.element.dataset.reteRendered) {
                view.element.innerHTML = '';
                view.element.appendChild(renderNodeDom(ctx.data.node));
                view.element.dataset.reteRendered = '1';
            }
        }
        if (ctx.type === 'nodetranslated' || ctx.type === 'noderesized' || ctx.type === 'rendered') {
            redrawConnections();
        }
        return ctx;
    });

    // Add nodes from config.
    const nodeMap = new Map();
    for (const n of config.nodes || []) {
        const node = new DiagramNode(n);
        nodeMap.set(n.id, node);
        await editor.addNode(node);
        await area.translate(node.id, { x: n.x, y: n.y });
    }

    // Helper: derive screen-space (canvas-space, pre-transform) anchor points
    // for a node based on its current translation + dimensions.
    function anchor(nodeId, side) {
        const node = nodeMap.get(nodeId);
        const view = area.nodeViews.get(nodeId);
        if (!node || !view) return null;
        const { x, y } = view.position;
        const w = node.width;
        const h = node.height;
        switch (side) {
            case 'left':   return { x: x,         y: y + h / 2 };
            case 'right':  return { x: x + w,     y: y + h / 2 };
            case 'top':    return { x: x + w / 2, y: y };
            case 'bottom': return { x: x + w / 2, y: y + h };
            default:       return { x: x + w / 2, y: y + h / 2 };
        }
    }

    function redrawConnections() {
        // Compute bounding box across all groups + nodes so the SVG covers the canvas.
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        (config.groups || []).forEach(g => {
            minX = Math.min(minX, g.x); minY = Math.min(minY, g.y);
            maxX = Math.max(maxX, g.x + g.w); maxY = Math.max(maxY, g.y + g.h);
        });
        nodeMap.forEach((node, id) => {
            const v = area.nodeViews.get(id);
            if (!v) return;
            minX = Math.min(minX, v.position.x);
            minY = Math.min(minY, v.position.y);
            maxX = Math.max(maxX, v.position.x + node.width);
            maxY = Math.max(maxY, v.position.y + node.height);
        });
        if (!isFinite(minX)) return;

        svg.setAttribute('viewBox', `${minX - 20} ${minY - 20} ${maxX - minX + 40} ${maxY - minY + 40}`);
        svg.style.width  = (maxX - minX + 40) + 'px';
        svg.style.height = (maxY - minY + 40) + 'px';
        svg.style.transform = `translate(${minX - 20}px, ${minY - 20}px)`;

        // Rebuild paths.
        svg.innerHTML = '';
        (config.connections || []).forEach(c => {
            const a = anchor(c.from, c.fromSide || 'right');
            const b = anchor(c.to,   c.toSide   || 'left');
            if (!a || !b) return;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', buildPath(a.x, a.y, b.x, b.y));
            path.setAttribute('class', `rete-connection rete-connection--${c.kind || 'default'}`);
            svg.appendChild(path);
        });
    }

    // Initial layout pass.
    await AreaExtensions.zoomAt(area, editor.getNodes());
    redrawConnections();
}

function bootstrap() {
    document.querySelectorAll('.rete-diagram:not(.rete-diagram--ready)').forEach(el => {
        // Defer to next frame so layout is settled before measuring.
        requestAnimationFrame(() => init(el));
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
