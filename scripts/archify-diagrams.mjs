import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(root, 'docs', 'archify');
const specs = [
  { file: 'architecture.json', html: 'architecture.html', kind: 'architecture' },
  { file: 'manual-demo-sequence.json', html: 'manual-demo-sequence.html', kind: 'sequence' },
];
const sequenceCanvasWidth = 1900;
const participantCardWidth = 164;
const participantCardHeight = 60;
const participantCardHalfWidth = participantCardWidth / 2;

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const xml = esc;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const isGeneratedConvention = (value) => /^runs\/<run-id>\//.test(value);
const sourceHref = (value) => isGeneratedConvention(value) ? null : `../../${value}`;

function sourceLinks(items = []) {
  return items.map((item) => {
    const path = typeof item === 'string' ? item : item.path;
    const note = typeof item === 'string' ? '' : item.note;
    const kind = typeof item === 'string' ? 'direct' : (item.kind ?? 'direct');
    const href = sourceHref(path);
    const label = `${path}${note ? ` — ${note}` : ''}`;
    return `<li class="source ${kind}">${href ? `<a href="${esc(href)}">${esc(label)}</a>` : `<code>${esc(label)}</code>`}<span class="tag">${esc(kind)}</span></li>`;
  }).join('');
}

function textLines(value, x, y, className, lineHeight = 18) {
  return String(value ?? '').split('\n').map((line, index) => `<text class="${className}" x="${x}" y="${y + index * lineHeight}">${xml(line)}</text>`).join('');
}

function palette() {
  return `
  :root { color-scheme: dark; --bg:#0b1020; --panel:#121a2d; --panel-2:#17223a; --ink:#eff5ff; --muted:#a7b7d4; --grid:#243452; --line:#8ba2c7; --accent:#73d4ff; --direct:#64e6a9; --inference:#ffc56d; --external:#b698ff; }
  :root[data-theme="light"] { color-scheme: light; --bg:#eef3fb; --panel:#ffffff; --panel-2:#e8eff9; --ink:#15213a; --muted:#526176; --grid:#c8d5e8; --line:#55739e; --accent:#0077b6; --direct:#087f5b; --inference:#a85d00; --external:#6b4cc7; }
  * { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; }
  .shell { min-height:100vh; padding:24px; } header, main, footer { max-width:1880px; margin:0 auto; } header { display:flex; justify-content:space-between; gap:24px; align-items:flex-start; margin-bottom:18px; } h1 { margin:0 0 6px; font-size:clamp(20px,2vw,30px); letter-spacing:-.04em; } p { margin:0; color:var(--muted); } .eyebrow { color:var(--accent); text-transform:uppercase; letter-spacing:.12em; font-size:11px; font-weight:700; }
  .toolbar { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; } button, .button { border:1px solid var(--grid); border-radius:8px; background:var(--panel); color:var(--ink); padding:8px 11px; font:inherit; text-decoration:none; cursor:pointer; } button:hover, .button:hover { border-color:var(--accent); }
  .stage { background:var(--panel); border:1px solid var(--grid); border-radius:16px; padding:14px; overflow:auto; box-shadow:0 18px 50px #06101e33; } svg { display:block; width:100%; min-width:1100px; height:auto; background:var(--panel); border-radius:10px; }
  .diagram-bg { fill:var(--panel); } .grid-line { stroke:var(--grid); stroke-width:1; opacity:.35; } .container { fill:var(--panel-2); stroke:var(--grid); stroke-width:1.4; } .container-label { fill:var(--muted); font-size:12px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; } .edge { fill:none; stroke:var(--line); stroke-width:2.2; } .edge.direct { stroke:var(--direct); } .edge.inference { stroke:var(--inference); stroke-dasharray:7 7; } .edge.return { stroke:var(--muted); stroke-dasharray:7 7; }
  .node { fill:var(--panel); stroke:var(--line); stroke-width:1.5; } .node.direct { stroke:var(--direct); } .node.inference { stroke:var(--inference); } .node.external { stroke:var(--external); } .node-title { fill:var(--ink); font-size:15px; font-weight:800; } .node-detail { fill:var(--muted); font-size:11px; } .node-ref { fill:var(--accent); font-size:10px; } .badge { fill:var(--panel-2); stroke:currentColor; stroke-width:1; } .badge-text { fill:var(--ink); font-size:9px; font-weight:800; letter-spacing:.08em; }
  .legend { display:flex; flex-wrap:wrap; gap:14px; align-items:center; margin-top:12px; color:var(--muted); font-size:12px; } .legend span { display:inline-flex; align-items:center; gap:7px; } .swatch { width:24px; height:3px; display:inline-block; background:var(--direct); } .swatch.inference { background:var(--inference); border-top:3px dashed var(--inference); height:0; } .swatch.external { background:var(--external); }
  .sources { margin-top:18px; display:grid; grid-template-columns:minmax(0,1.4fr) minmax(280px,.8fr); gap:18px; } .card { background:var(--panel); border:1px solid var(--grid); border-radius:12px; padding:16px; } h2 { margin:0 0 10px; font-size:15px; } ul { margin:0; padding-left:18px; } .source { margin:6px 0; color:var(--muted); } .source a, .source code { color:var(--accent); overflow-wrap:anywhere; } .tag { display:inline-block; margin-left:8px; padding:1px 5px; border:1px solid currentColor; border-radius:5px; font-size:9px; text-transform:uppercase; } .source.inference .tag { color:var(--inference); } .source.direct .tag { color:var(--direct); } .notice { border-left:3px solid var(--inference); padding-left:12px; color:var(--muted); } footer { padding:18px 0 6px; color:var(--muted); font-size:11px; } footer a { color:var(--accent); }
  .participant { fill:var(--panel); stroke:var(--line); stroke-width:1.5; } .participant-title { fill:var(--ink); font-size:13px; font-weight:800; } .participant-detail { fill:var(--muted); font-size:10px; } .lifeline { stroke:var(--grid); stroke-width:1.5; stroke-dasharray:4 6; } .message-label { fill:var(--ink); font-size:11px; } .message-label-bg { fill:var(--panel); stroke:var(--grid); stroke-width:1; opacity:.96; } .step { fill:var(--accent); font-size:10px; font-weight:800; }
  @media (max-width:900px) { .shell { padding:12px; } header { display:block; } .toolbar { justify-content:flex-start; margin-top:12px; } .sources { grid-template-columns:1fr; } }
  `;
}

function markers() {
  return `<defs><marker id="arrow-direct" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 z" fill="var(--direct)"/></marker><marker id="arrow-inference" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 z" fill="var(--inference)"/></marker><marker id="arrow-return" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 z" fill="var(--muted)"/></marker></defs>`;
}

function architectureSvg(spec) {
  const width = 1720; const height = 920;
  const nodes = Object.fromEntries(spec.nodes.map((node) => [node.id, node]));
  const grid = Array.from({ length: 9 }, (_, index) => `<line class="grid-line" x1="40" y1="${70 + index * 100}" x2="${width - 40}" y2="${70 + index * 100}"/>`).join('');
  const containers = spec.containers.map((c) => `<rect class="container" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="14"/><text class="container-label" x="${c.x + 18}" y="${c.y + 26}">${xml(c.label)}</text>`).join('');
  const edges = spec.edges.map((edge) => {
    const a = nodes[edge.from]; const b = nodes[edge.to];
    const kind = edge.kind ?? 'direct';
    let d; let labelX; let labelY;
    if (a.x === b.x) {
      const x = a.x + a.w / 2; const down = b.y > a.y;
      const y1 = down ? a.y + a.h : a.y; const y2 = down ? b.y : b.y + b.h;
      d = `M ${x} ${y1} V ${y2}`; labelX = x; labelY = (y1 + y2) / 2;
    } else {
      const rightToLeft = a.x > b.x; const ax = rightToLeft ? a.x : a.x + a.w; const bx = rightToLeft ? b.x + b.w : b.x;
      const ay = a.y + a.h / 2; const by = b.y + b.h / 2; const mid = Math.round((ax + bx) / 2);
      d = `M ${ax} ${ay} H ${mid} V ${by} H ${bx}`; labelX = mid; labelY = (ay + by) / 2 - 7;
    }
    return `<path class="edge ${xml(kind)}" d="${d}" marker-end="url(#arrow-${kind === 'inference' ? 'inference' : 'direct'})"/><text class="node-detail" x="${labelX}" y="${labelY}" text-anchor="middle">${xml(edge.label)}</text>`;
  }).join('');
  const nodeMarkup = spec.nodes.map((node) => {
    const kind = node.kind ?? 'direct'; const badge = kind === 'inference' ? 'INFERENCE' : 'DIRECT';
    const href = sourceHref(node.refs?.[0]?.path ?? node.refs?.[0]);
    const titleLines = String(node.label).split('\n'); const detailY = node.y + 28 + titleLines.length * 17 + 5;
    const inner = `<rect class="node ${xml(kind)}" x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="11"/>${textLines(node.label, node.x + 16, node.y + 28, 'node-title', 17)}${textLines(node.detail, node.x + 16, detailY, 'node-detail', 15)}${node.refs?.[0] ? `<text class="node-ref" x="${node.x + 16}" y="${node.y + node.h - 13}">${xml(typeof node.refs[0] === 'string' ? node.refs[0] : node.refs[0].path)}</text>` : ''}`;
    return href ? `<a href="${esc(href)}">${inner}</a>` : inner;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="diagram-title diagram-desc"><title id="diagram-title">${xml(spec.title)}</title><desc id="diagram-desc">${xml(spec.description)}</desc>${markers()}<rect class="diagram-bg" width="${width}" height="${height}" rx="12"/>${grid}${containers}${edges}${nodeMarkup}<text class="node-detail" x="60" y="875">Direct = implemented or recorded repository evidence · Inference = explanatory relationship for the demo narration</text></svg>`;
}

function sequenceSvg(spec) {
  const width = sequenceCanvasWidth; const height = 1060; const top = 118; const bottom = 1000;
  const byId = Object.fromEntries(spec.participants.map((p) => [p.id, p]));
  const grid = Array.from({ length: 10 }, (_, index) => `<line class="grid-line" x1="30" y1="${top + index * 90}" x2="${width - 30}" y2="${top + index * 90}"/>`).join('');
  const participantMarkup = spec.participants.map((p) => `<rect class="participant" x="${p.x - participantCardHalfWidth}" y="30" width="${participantCardWidth}" height="${participantCardHeight}" rx="10"/><text class="participant-title" x="${p.x}" y="56" text-anchor="middle">${xml(p.label)}</text><text class="participant-detail" x="${p.x}" y="74" text-anchor="middle">${xml(p.detail)}</text><line class="lifeline" x1="${p.x}" y1="${top}" x2="${p.x}" y2="${bottom}"/>`).join('');
  const messageMarkup = spec.messages.map((m) => {
    const from = byId[m.from].x; const to = byId[m.to].x; const kind = m.kind ?? 'direct'; const edgeKind = m.return ? 'return' : kind;
    const lx = (from + to) / 2; const x1 = from < to ? from + 4 : from - 4; const x2 = from < to ? to - 4 : to + 4;
    const labelWidth = Math.max(130, m.label.length * 7.1 + 22);
    const marker = edgeKind === 'inference' ? 'inference' : edgeKind === 'return' ? 'return' : 'direct';
    return `<text class="step" x="48" y="${m.y + 4}">${xml(m.step)}</text><line class="edge ${edgeKind}" x1="${x1}" y1="${m.y}" x2="${x2}" y2="${m.y}" marker-end="url(#arrow-${marker})"/><rect class="message-label-bg" x="${lx - labelWidth / 2}" y="${m.y - 24}" width="${labelWidth}" height="20" rx="5"/><text class="message-label" x="${lx}" y="${m.y - 10}" text-anchor="middle">${xml(m.label)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="diagram-title diagram-desc"><title id="diagram-title">${xml(spec.title)}</title><desc id="diagram-desc">${xml(spec.description)}</desc>${markers()}<rect class="diagram-bg" width="${width}" height="${height}" rx="12"/>${grid}${participantMarkup}${messageMarkup}<text class="node-detail" x="60" y="1030">Green solid = direct evidence · Amber dashed = explanatory inference · Gray dashed = return or publication acknowledgement</text></svg>`;
}

function htmlFor(spec, svg) {
  const alternate = spec.diagramType === 'architecture' ? 'manual-demo-sequence.html' : 'architecture.html';
  const alternateLabel = spec.diagramType === 'architecture' ? 'Open manual sequence' : 'Open architecture';
  const data = JSON.stringify(spec).replaceAll('<', '\\u003c');
  return `<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="generator" content="archify-compatible deterministic renderer"><title>${esc(spec.title)}</title><style>${palette()}</style></head><body><div class="shell"><header><div><div class="eyebrow">PER-31 · Archify visual documentation</div><h1>${esc(spec.title)}</h1><p>${esc(spec.subtitle)}</p></div><nav class="toolbar"><button id="theme" type="button">Toggle theme</button><a class="button" href="${alternate}">${alternateLabel}</a><a class="button" href="README.md">Instructions</a></nav></header><main><section class="stage" aria-label="${esc(spec.title)} diagram">${svg}</section><div class="legend"><span><i class="swatch"></i>Direct evidence</span><span><i class="swatch inference"></i>Explanatory inference</span><span><i class="swatch external"></i>External handoff or operator boundary</span></div><section class="sources"><article class="card"><h2>Repository references</h2><ul>${sourceLinks(spec.references)}</ul></article><article class="card"><h2>Evidence boundary</h2><p class="notice">${esc(spec.evidenceBoundary)}</p></article></section></main><footer>Standalone local artifact. No CDN, runtime API, credentials, or network request is required. Source specification: <a href="${esc(spec.fileName)}">${esc(spec.fileName)}</a>.</footer></div><script type="application/json" id="diagram-data">${data}</script><script>const root=document.documentElement;const button=document.getElementById('theme');button.addEventListener('click',()=>{const next=root.dataset.theme==='dark'?'light':'dark';root.dataset.theme=next;try{localStorage.setItem('per31-archify-theme',next)}catch{}});try{const saved=localStorage.getItem('per31-archify-theme');if(saved==='light'||saved==='dark')root.dataset.theme=saved}catch{}</script></body></html>`;
}

function checkSpec(spec, filePath) {
  const errors = [];
  if (spec.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!spec.title || !spec.description) errors.push('title and description are required');
  if (!Array.isArray(spec.references) || spec.references.length < 8) errors.push('at least eight repository references are required');
  const ids = spec.diagramType === 'architecture' ? (spec.nodes ?? []).map((n) => n.id) : (spec.participants ?? []).map((p) => p.id);
  if (new Set(ids).size !== ids.length) errors.push('diagram IDs must be unique');
  for (const id of spec.requiredIds ?? []) if (!ids.includes(id)) errors.push(`required diagram ID missing: ${id}`);
  const numericFields = spec.diagramType === 'architecture'
    ? (spec.nodes ?? []).flatMap((n) => [n.x, n.y, n.w, n.h])
    : (spec.participants ?? []).flatMap((p) => [p.x]);
  if (numericFields.some((value) => !Number.isFinite(value))) errors.push('all diagram coordinates must be finite numbers');
  if (spec.diagramType === 'sequence') {
    const participants = [...(spec.participants ?? [])].sort((a, b) => a.x - b.x);
    participants.forEach((participant, index) => {
      if (participant.x - participantCardHalfWidth < 0 || participant.x + participantCardHalfWidth > sequenceCanvasWidth) {
        errors.push(`participant card is clipped by the sequence canvas: ${participant.id}`);
      }
      const labelWidth = String(participant.label ?? '').length * 7.8 + 20;
      const detailWidth = String(participant.detail ?? '').length * 6.2 + 20;
      if (labelWidth > participantCardWidth || detailWidth > participantCardWidth) errors.push(`participant label may not fit its card: ${participant.id}`);
      if (index > 0 && participant.x - participants[index - 1].x < participantCardWidth) {
        errors.push(`participant cards overlap: ${participants[index - 1].id} and ${participant.id}`);
      }
    });
  }
  if (spec.diagramType === 'architecture') {
    const idSet = new Set(ids);
    for (const edge of spec.edges ?? []) if (!idSet.has(edge.from) || !idSet.has(edge.to)) errors.push(`edge references unknown node: ${edge.from} -> ${edge.to}`);
  } else {
    const idSet = new Set(ids);
    for (const message of spec.messages ?? []) if (!idSet.has(message.from) || !idSet.has(message.to)) errors.push(`message references unknown participant: ${message.from} -> ${message.to}`);
  }
  for (const item of spec.references ?? []) {
    const path = typeof item === 'string' ? item : item.path;
    if (!path || path.startsWith('/') || path.includes('..') || (!isGeneratedConvention(path) && !existsSync(join(root, path)))) errors.push(`reference does not resolve inside repository: ${path}`);
  }
  if (errors.length) throw new Error(`${relative(root, filePath)} validation failed:\n- ${errors.join('\n- ')}`);
}

function validateHtml(spec, html, htmlPath) {
  const errors = [];
  if ((html.match(/<svg\b/g) ?? []).length !== 1) errors.push('expected exactly one inline SVG');
  if (/NaN|Infinity|undefined/.test(html)) errors.push('generated HTML contains an invalid numeric or undefined token');
  if (/https?:\/\//i.test(html)) errors.push('generated HTML contains a runtime network URL');
  if (/\/(?:Users|private|home)\//i.test(html)) errors.push('generated HTML contains an absolute machine path');
  if (/(?:BEGIN (?:RSA|OPENSSH)|gh[pousr]_|(?:api|pat|token|password)\s*[:=])/i.test(html)) errors.push('generated HTML contains a credential-like token');
  if (!html.includes('No CDN, runtime API, credentials, or network request')) errors.push('offline boundary text is missing');
  if (errors.length) throw new Error(`${relative(root, htmlPath)} validation failed:\n- ${errors.join('\n- ')}`);
}

async function readSpec(entry) {
  const filePath = join(outputDir, entry.file);
  const spec = JSON.parse(await readFile(filePath, 'utf8'));
  spec.fileName = entry.file;
  spec.diagramType = spec.diagramType ?? entry.kind;
  checkSpec(spec, filePath);
  return { spec, filePath };
}

async function buildTo(targetDir) {
  const rendered = [];
  for (const entry of specs) {
    const { spec } = await readSpec(entry);
    const svg = spec.diagramType === 'architecture' ? architectureSvg(spec) : sequenceSvg(spec);
    const html = htmlFor(spec, svg);
    await writeFile(join(targetDir, entry.html), html);
    rendered.push({ entry, html });
  }
  return rendered;
}

async function validateAll() {
  for (const entry of specs) {
    const { spec } = await readSpec(entry);
    const htmlPath = join(outputDir, entry.html);
    const html = await readFile(htmlPath, 'utf8');
    validateHtml(spec, html, htmlPath);
  }
  console.log(`Archify validation passed: ${specs.length} diagrams, inline SVG, finite layout, local references, offline boundary, no secrets.`);
}

const command = process.argv[2] ?? 'build';
if (!['build', 'validate', 'verify'].includes(command)) throw new Error('Usage: node scripts/archify-diagrams.mjs <build|validate|verify>');
if (command === 'build') {
  await buildTo(outputDir);
  console.log(`Archify diagrams built in ${relative(root, outputDir)}/`);
} else if (command === 'validate') {
  await validateAll();
} else {
  await validateAll();
  const temp = await mkdtemp(join(tmpdir(), 'per31-archify-'));
  try {
    const rendered = await buildTo(temp);
    for (const { entry, html } of rendered) {
      const committed = await readFile(join(outputDir, entry.html), 'utf8');
      const regenerated = await readFile(join(temp, entry.html), 'utf8');
      if (committed !== regenerated) throw new Error(`deterministic regeneration mismatch: ${entry.html}`);
      if (sha256(committed) !== sha256(regenerated)) throw new Error(`hash mismatch: ${entry.html}`);
    }
    console.log(`Archify deterministic regeneration passed: ${rendered.map(({ entry, html }) => `${entry.html} (${sha256(html).slice(0, 12)})`).join(', ')}`);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
