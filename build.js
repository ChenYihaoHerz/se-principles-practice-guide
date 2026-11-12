// Builds the multi-page study site from src/ into docs/.
// Usage: node build.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "docs");
const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const pad = (n) => String(n).padStart(2, "0");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const BOOK = "系统工程原理与实践";

/* ---------- read chapters ---------- */
const chapters = [];
for (let n = 1; n <= 23; n++) {
  const file = path.join(SRC, "chapters", "ch" + pad(n) + ".html");
  let html = read(file);
  let part = null;
  const pm = html.match(/<h2 class="part"[^>]*data-short="([^"]*)"[^>]*>([\s\S]*?)<\/h2>\s*<div class="part-intro">([\s\S]*?)<\/div>/);
  if (pm) {
    const intro = pm[3];
    const h3 = (intro.match(/<h3>([\s\S]*?)<\/h3>/) || [])[1] || "";
    const body = intro.replace(/<h3>[\s\S]*?<\/h3>/, "").trim();
    part = { short: pm[1], label: pm[2].trim(), title: h3.trim(), intro: body };
    html = html.replace(pm[0], "");
  }
  const am = html.match(/<article class="chapter"[^>]*>/);
  if (!am) throw new Error("no article in ch" + n);
  const attr = (k) => ((am[0].match(new RegExp(k + '="([^"]*)"')) || [])[1]);
  const en = (html.match(/<div class="en">([\s\S]*?)<\/div>/) || [])[1] || "";
  chapters.push({ n, id: "ch" + n, file: "ch" + pad(n) + ".html", title: attr("data-title"), core: !!attr("data-core"), en: en.trim(), html: html.trim(), part });
}
// assign parts to chapters
const parts = [];
chapters.forEach((c) => { if (c.part) parts.push(Object.assign({ chapters: [] }, c.part)); parts[parts.length - 1].chapters.push(c); c.partInfo = parts[parts.length - 1]; });

/* ---------- harvest globals (GLOSSARY) by running each chapter script in a sandbox ---------- */
function stub() {
  const f = function () {};
  const p = new Proxy(f, {
    get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === "length" ? 0 : k === Symbol.iterator ? function* () {} : p),
    apply: () => p, construct: () => p, set: () => true,
  });
  return p;
}
const GLOSSARY = {};
chapters.forEach((c) => {
  const scripts = [...c.html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  scripts.forEach((code) => {
    const s = stub();
    const ctx = { GLOSSARY: {}, DIAGRAMS: {}, QUIZ: {}, SIMS: {}, SORTS: {}, STEPS: {}, document: s, window: s, localStorage: s, addEventListener: s, matchMedia: s, setTimeout: () => 0, console };
    try { vm.runInNewContext(code, ctx, { timeout: 1000 }); }
    catch (e) { /* custom widget code may fail in the sandbox; glossary is assigned before it */ }
    Object.assign(GLOSSARY, ctx.GLOSSARY);
  });
});

/* ---------- link rewriting: #chN -> chNN.html ---------- */
function relink(html) {
  return html.replace(/href=(['"])#ch(\d+)(?:-([\w-]+))?\1/g, (m, q, n, frag) => "href=" + q + "ch" + pad(+n) + ".html" + (frag ? "#" + frag : "") + q);
}

/* ---------- page shell ---------- */
function toc(currentId) {
  let s = "";
  parts.forEach((p) => {
    s += '<div class="toc-part">' + esc(p.short) + "</div>";
    p.chapters.forEach((c) => {
      s += '<a href="' + c.file + '" data-ch="' + c.id + '" class="' + (c.core ? "core" : "") + (c.id === currentId ? " active" : "") + '"' + (c.id === currentId ? ' aria-current="page"' : "") +
        '><span class="num">' + c.n + '</span><span class="lbl">' + esc(c.title) + '</span><span class="chk" aria-hidden="true"></span></a>';
    });
  });
  return s;
}
function shell({ title, bodyClass, currentId, main, scripts, desc }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${desc ? `<meta name="description" content="${esc(desc)}">` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@400;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css">
<script>try{var t=localStorage.getItem("se-guide:theme");if(t)document.documentElement.setAttribute("data-theme",JSON.parse(t));}catch(e){}</script>
<script>var QUIZ={}, GLOSSARY={}, DIAGRAMS={}, SIMS={}, SORTS={}, STEPS={};</script>
<script src="assets/glossary.js"></script>
</head>
<body class="${bodyClass || ""}">
<div class="topbar">
  <button class="iconbtn menu-btn" id="menuBtn" aria-label="打开目录">☰<span class="lbl-txt"> 目录</span></button>
  <a class="title" href="index.html"><b>${BOOK}</b>　导读</a>
  <a class="iconbtn" id="mapBtn" href="concepts.html"><svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.2"/><circle cx="2.6" cy="3.2" r="1.5"/><circle cx="13.4" cy="3.6" r="1.5"/><circle cx="3" cy="13" r="1.5"/><circle cx="13" cy="12.6" r="1.5"/><path d="M8 8 L2.6 3.2 M8 8 L13.4 3.6 M8 8 L3 13 M8 8 L13 12.6"/></svg><span class="lbl-txt">概念图</span></a>
  <button class="iconbtn" id="themeBtn" aria-label="切换深浅色">◐<span class="lbl-txt"> 深浅色</span></button>
</div>
<div class="progress" id="progress"></div>
<nav class="sidebar" id="sidebar" aria-label="目录">
  <a class="side-home" href="index.html">全书导读首页</a>
  <div class="side-stat">
    <div class="row"><span>已读章节</span><b id="readCount">0 / 23</b></div>
    <div class="bar"><i id="readBar"></i></div>
  </div>
  <div class="toc" id="toc">${toc(currentId)}</div>
</nav>
<div class="scrim" id="scrim"></div>
<main>
<div class="wrap">
${main}
</div>
</main>
<div class="pop" id="pop" role="tooltip"></div>
${scripts || ""}
<script src="assets/app.js"></script>
</body>
</html>
`;
}

/* ---------- chapter pages ---------- */
chapters.forEach((c, i) => {
  const prev = chapters[i - 1], next = chapters[i + 1];
  let body = relink(c.html);
  // split scripts out so content renders first and scripts run before app.js
  const scripts = [];
  body = body.replace(/<script>([\s\S]*?)<\/script>/g, (m, code) => { scripts.push("<script>" + code + "</script>"); return ""; });
  const nav = `<nav class="pager" aria-label="翻页">
  ${prev ? `<a class="prev" href="${prev.file}"><small>上一章</small><span>第 ${prev.n} 章　${esc(prev.title)}</span></a>` : `<a class="prev" href="index.html"><small>返回</small><span>全书导读首页</span></a>`}
  ${next ? `<a class="next" href="${next.file}"><small>下一章</small><span>第 ${next.n} 章　${esc(next.title)}</span></a>` : `<a class="next" href="concepts.html"><small>读完全书</small><span>全书概念图</span></a>`}
</nav>`;
  const main = `<div class="part-tag"><a href="index.html#${"part" + (parts.indexOf(c.partInfo) + 1)}">${esc(c.partInfo.short)}</a></div>
${body}
${nav}`;
  write(path.join(OUT, c.file), shell({ title: `第 ${c.n} 章 ${c.title} · ${BOOK}导读`, currentId: c.id, main, scripts: scripts.join("\n"), bodyClass: "page-ch", desc: `${BOOK}第 ${c.n} 章“${c.title}”的中文导读` }));
});

/* ---------- index page ---------- */
{
  let intro = relink(read(path.join(SRC, "pages", "intro.html")));
  const scripts = [];
  intro = intro.replace(/<script>([\s\S]*?)<\/script>/g, (m, code) => { scripts.push("<script>" + code + "</script>"); return ""; });
  let map = '<section class="bookmap" id="parts">';
  parts.forEach((p, i) => {
    map += `<div class="bm-part" id="part${i + 1}"><div class="bm-head"><span class="bm-n">${esc(p.label)}</span><h3>${esc(p.title)}</h3></div>${p.intro ? relink(p.intro) : ""}<div class="bm-list">`;
    p.chapters.forEach((c) => {
      map += `<a class="bm-ch${c.core ? " core" : ""}" href="${c.file}" data-ch="${c.id}"><span class="bm-num">${c.n}</span><span class="bm-t"><b>${esc(c.title)}</b><i>${esc(c.en)}</i></span><span class="chk" aria-hidden="true"></span></a>`;
    });
    map += "</div></div>";
  });
  map += "</section>";
  const main = intro.replace("<!--BOOKMAP-->", map) + `
<div class="endnote"><p>本导读依据 Alexander Kossiakoff、Samuel J. Seymour、David A. Flanigan、Steven M. Biemer 所著《Systems Engineering Principles and Practice》（第三版，Wiley，2020）编写，章节编号与原书一致。</p></div>`;
  write(path.join(OUT, "index.html"), shell({ title: `${BOOK} · 导读`, main, scripts: scripts.join("\n"), bodyClass: "page-index", desc: `${BOOK}（Kossiakoff 等，第三版）的中文交互式导读` }));
}

/* ---------- concept map page ---------- */
{
  const main = `<header class="cm-head"><h1>全书概念图</h1><div class="en">Concept Map</div></header>
<div class="cm" id="cm"></div>`;
  write(path.join(OUT, "concepts.html"), shell({ title: `全书概念图 · ${BOOK}导读`, main, scripts: '<script src="assets/concepts.js"></script>\n<script src="assets/cmap.js"></script>', bodyClass: "page-concepts" }));
}

/* ---------- assets ---------- */
write(path.join(OUT, "assets", "glossary.js"), "Object.assign(GLOSSARY, " + JSON.stringify(GLOSSARY, null, 0) + ");\n");
["style.css", "app.js", "concepts.js", "cmap.js"].forEach((f) => { const p = path.join(SRC, "assets", f); if (fs.existsSync(p)) write(path.join(OUT, "assets", f), read(p)); });
write(path.join(OUT, ".nojekyll"), "");
write(path.join(OUT, "chapters.json"), JSON.stringify(chapters.map((c) => ({ id: c.id, n: c.n, file: c.file, title: c.title, part: parts.indexOf(c.partInfo) })), null, 0));
console.log("built", chapters.length, "chapters,", Object.keys(GLOSSARY).length, "glossary terms");
