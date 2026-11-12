(function(){
  "use strict";
  var C = window.CONCEPTS, host = document.getElementById("cm");
  if (!C || !host) return;
  function get(k, d){ try{ var v = localStorage.getItem("se-guide:"+k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } }
  function set(k, v){ try{ localStorage.setItem("se-guide:"+k, JSON.stringify(v)); }catch(e){} }
  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var NS = "http://www.w3.org/2000/svg";

  var read = get("read", {}), seen = get("seen", {}), showAll = !!get("cmAll", false);
  var known = get("cmKnown", null);
  var byK = {}, clusters = {}, incoming = {};
  C.clusters.forEach(function(c){ clusters[c.k] = c; c.nodes = []; });
  C.nodes.forEach(function(n){ byK[n.k] = n; if (clusters[n.c]) clusters[n.c].nodes.push(n); });
  C.nodes.forEach(function(n){ (n.rel || []).forEach(function(r){ if (!byK[r[0]]) { console.warn("concept rel target missing", n.k, r[0]); return; } (incoming[r[0]] = incoming[r[0]] || []).push([n.k, r[1]]); }); });
  var chTitle = {};
  Array.prototype.forEach.call(document.querySelectorAll(".toc a[data-ch]"), function(a){ chTitle[a.dataset.ch.slice(2)] = a.querySelector(".lbl").textContent; });
  function chFile(n){ return "ch" + (n < 10 ? "0" : "") + n + ".html"; }
  function chDone(n){ return !!(read["ch"+n] || seen["ch"+n]); }
  function reached(n){ return n.ch.some(chDone); }
  function isOpen(n){ return showAll || reached(n); }

  /* ---------- scaffold ---------- */
  var bar = el("div", "cm-bar");
  var count = el("span", "cm-count");
  var allLbl = el("label", "cm-all"), allBox = document.createElement("input");
  allBox.type = "checkbox"; allBox.checked = showAll;
  allLbl.appendChild(allBox); allLbl.appendChild(document.createTextNode("显示尚未读到的概念"));
  bar.appendChild(count); bar.appendChild(allLbl);
  var layout = el("div", "cm-layout");
  var board = el("div", "cm-board");
  var svg = document.createElementNS(NS, "svg"); svg.setAttribute("class", "cm-lines"); svg.setAttribute("aria-hidden", "true");
  board.appendChild(svg);
  var rootBtn = el("button", "cm-root"); rootBtn.type = "button";
  rootBtn.appendChild(el("b", "", C.root.zh)); rootBtn.appendChild(el("i", "", C.root.en));
  rootBtn.addEventListener("click", function(){ select("root"); });
  board.appendChild(rootBtn);
  var grid = el("div", "cm-grid"); board.appendChild(grid);
  var panel = el("aside", "cm-panel"); panel.setAttribute("aria-live", "polite");
  layout.appendChild(board); layout.appendChild(panel);
  host.appendChild(bar); host.appendChild(layout);

  var chipOf = {}, headOf = {};
  C.clusters.forEach(function(c){
    var sec = el("section", "cm-cl"); sec.dataset.c = c.k;
    var h = el("button", "cm-cl-h"); h.type = "button";
    h.appendChild(el("b", "", c.zh)); h.appendChild(el("i", "", c.en));
    h.addEventListener("click", function(){ select("c:" + c.k); });
    sec.appendChild(h); headOf[c.k] = h;
    var chips = el("div", "cm-chips");
    c.nodes.forEach(function(n){
      var b = el("button", "cm-n"); b.type = "button"; b.dataset.k = n.k;
      b.appendChild(el("span", "", n.s || n.zh));
      b.addEventListener("click", function(){ select(n.k); });
      chips.appendChild(b); chipOf[n.k] = b;
    });
    sec.appendChild(chips); grid.appendChild(sec);
  });

  function paintState(){
    var open = 0;
    if (!known) known = {};
    C.nodes.forEach(function(n){
      var o = isOpen(n), r = reached(n);
      if (r) open++;
      var b = chipOf[n.k];
      b.classList.toggle("locked", !o);
      b.classList.toggle("fresh", r && !known[n.k] && Object.keys(known).length > 0);
      b.setAttribute("aria-label", (n.zh) + (o ? "" : "（尚未读到）"));
    });
    count.textContent = "已读到 " + open + " / " + C.nodes.length + " 个概念";
  }
  function rememberKnown(){
    var k = {}; C.nodes.forEach(function(n){ if (reached(n)) k[n.k] = 1; });
    set("cmKnown", k);
  }
  allBox.addEventListener("change", function(){ showAll = allBox.checked; set("cmAll", showAll); paintState(); select(current, true); });

  /* ---------- panel ---------- */
  function chipBtn(k){
    var n = byK[k], b = el("button", "cm-ref" + (isOpen(n) ? "" : " locked"), n.zh); b.type = "button";
    b.addEventListener("click", function(){ select(k); });
    return b;
  }
  function chLinks(list){
    var ul = el("ul", "cm-chs");
    list.forEach(function(n){
      var li = el("li"), a = el("a", chDone(n) ? "done" : "");
      a.href = chFile(n); a.appendChild(el("span", "cm-chn", "第 " + n + " 章")); a.appendChild(document.createTextNode(chTitle[n] || ""));
      li.appendChild(a); ul.appendChild(li);
    });
    return ul;
  }
  function head(zh, en, tag){
    var h = el("div", "cm-p-head");
    if (tag) h.appendChild(tag);
    h.appendChild(el("h2", "", zh)); h.appendChild(el("div", "cm-p-en", en));
    return h;
  }
  function closeBtn(){
    var x = el("button", "cm-close", "×"); x.type = "button"; x.setAttribute("aria-label", "收起");
    x.addEventListener("click", function(){ document.body.classList.remove("cm-sheet"); });
    return x;
  }
  function renderPanel(key){
    panel.innerHTML = ""; panel.appendChild(closeBtn());
    if (key === "root"){
      panel.appendChild(head(C.root.zh, C.root.en));
      panel.appendChild(el("p", "cm-def", C.root.def));
      var ul = el("ul", "cm-cls");
      C.clusters.forEach(function(c){
        var li = el("li"), b = el("button", "cm-ref", c.zh); b.type = "button";
        b.addEventListener("click", function(){ select("c:" + c.k); });
        li.appendChild(b); li.appendChild(el("span", "", c.def)); ul.appendChild(li);
      });
      panel.appendChild(ul);
      return;
    }
    if (key.indexOf("c:") === 0){
      var c = clusters[key.slice(2)];
      panel.appendChild(head(c.zh, c.en));
      panel.appendChild(el("p", "cm-def", c.def));
      var box = el("div", "cm-refs");
      c.nodes.forEach(function(n){ box.appendChild(chipBtn(n.k)); });
      panel.appendChild(box);
      return;
    }
    var n = byK[key], cl = clusters[n.c];
    var tag = el("button", "cm-tag", cl.zh); tag.type = "button";
    tag.addEventListener("click", function(){ select("c:" + cl.k); });
    panel.appendChild(head(n.zh, n.en, tag));
    if (!isOpen(n)){
      panel.appendChild(el("p", "cm-lock", "这个概念在下面这些章节里展开："));
      panel.appendChild(chLinks(n.ch));
      return;
    }
    panel.appendChild(el("p", "cm-def", n.def));
    if (n.ex){ var ex = el("div", "cm-ex"); ex.appendChild(el("div", "cm-sub", "例子")); ex.appendChild(el("p", "", n.ex)); panel.appendChild(ex); }
    var outs = (n.rel || []).filter(function(r){ return byK[r[0]]; }), ins = incoming[n.k] || [];
    if (outs.length || ins.length){
      panel.appendChild(el("div", "cm-sub", "与其他概念的关系"));
      var rl = el("ul", "cm-rels");
      outs.forEach(function(r){
        var li = el("li", "out"); li.appendChild(el("span", "cm-self", n.s || n.zh)); li.appendChild(el("em", "", r[1])); li.appendChild(chipBtn(r[0])); rl.appendChild(li);
      });
      ins.forEach(function(r){
        var li = el("li", "in"); li.appendChild(chipBtn(r[0])); li.appendChild(el("em", "", r[1])); li.appendChild(el("span", "cm-self", n.s || n.zh)); rl.appendChild(li);
      });
      panel.appendChild(rl);
    }
    panel.appendChild(el("div", "cm-sub", "相关章节"));
    panel.appendChild(chLinks(n.ch));
  }

  /* ---------- selection and relation lines ---------- */
  var current = null;
  function related(key){
    var out = [], inn = [];
    if (key === "root") return {out: C.clusters.map(function(c){ return headOf[c.k]; }), inn: []};
    if (key.indexOf("c:") === 0) return {out: clusters[key.slice(2)].nodes.map(function(n){ return chipOf[n.k]; }), inn: [], cluster: true};
    (byK[key].rel || []).forEach(function(r){ if (chipOf[r[0]]) out.push(chipOf[r[0]]); });
    (incoming[key] || []).forEach(function(r){ inn.push(chipOf[r[0]]); });
    return {out: out, inn: inn};
  }
  function srcEl(key){ return key === "root" ? rootBtn : key.indexOf("c:") === 0 ? headOf[key.slice(2)] : chipOf[key]; }
  function center(e, b){ var r = e.getBoundingClientRect(); return {x: r.left - b.left + r.width/2, y: r.top - b.top + r.height/2, w: r.width, h: r.height}; }
  function edge(p, q){
    // point on the border of box p in the direction of q
    var dx = q.x - p.x, dy = q.y - p.y; if (!dx && !dy) return {x: p.x, y: p.y};
    var sx = dx ? (p.w/2) / Math.abs(dx) : Infinity, sy = dy ? (p.h/2) / Math.abs(dy) : Infinity, s = Math.min(sx, sy);
    return {x: p.x + dx*s, y: p.y + dy*s};
  }
  function draw(){
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!current) return;
    var b = board.getBoundingClientRect();
    svg.setAttribute("width", b.width); svg.setAttribute("height", b.height); svg.setAttribute("viewBox", "0 0 " + b.width + " " + b.height);
    var rel = related(current), s = srcEl(current);
    if (rel.cluster || current === "root") return;
    var sp = center(s, b);
    function line(t, cls){
      if (!t || t === s) return;
      var tp = center(t, b), a = edge(sp, tp), z = edge(tp, sp);
      var mx = (a.x + z.x)/2, my = (a.y + z.y)/2, dx = z.x - a.x, dy = z.y - a.y, len = Math.sqrt(dx*dx + dy*dy) || 1;
      var bend = Math.min(60, len * 0.18), cx = mx - dy/len*bend, cy = my + dx/len*bend;
      var p = document.createElementNS(NS, "path");
      p.setAttribute("d", "M" + a.x.toFixed(1) + " " + a.y.toFixed(1) + " Q" + cx.toFixed(1) + " " + cy.toFixed(1) + " " + z.x.toFixed(1) + " " + z.y.toFixed(1));
      p.setAttribute("class", cls); svg.appendChild(p);
      var d = document.createElementNS(NS, "circle"); d.setAttribute("cx", z.x.toFixed(1)); d.setAttribute("cy", z.y.toFixed(1)); d.setAttribute("r", 2.6); d.setAttribute("class", cls + " dot");
      if (cls === "in"){ d.setAttribute("cx", a.x.toFixed(1)); d.setAttribute("cy", a.y.toFixed(1)); }
      svg.appendChild(d);
    }
    rel.inn.forEach(function(t){ line(t, "in"); });
    rel.out.forEach(function(t){ line(t, "out"); });
  }
  function select(key, keepScroll){
    if (!key || (key !== "root" && key.indexOf("c:") !== 0 && !byK[key]) || (key.indexOf("c:") === 0 && !clusters[key.slice(2)])) key = "root";
    current = key;
    var rel = related(key), s = srcEl(key);
    var all = Object.keys(chipOf).map(function(k){ return chipOf[k]; }).concat(Object.keys(headOf).map(function(k){ return headOf[k]; }), [rootBtn]);
    all.forEach(function(e){ e.classList.remove("sel", "r-out", "r-in", "dim"); e.removeAttribute("aria-current"); });
    board.classList.toggle("focus", key !== "root" && key.indexOf("c:") !== 0);
    s.classList.add("sel"); s.setAttribute("aria-current", "true");
    rel.out.forEach(function(e){ e.classList.add("r-out"); });
    rel.inn.forEach(function(e){ e.classList.add("r-in"); });
    Array.prototype.forEach.call(grid.querySelectorAll(".cm-cl"), function(sec){ sec.classList.toggle("on", key === "c:" + sec.dataset.c || (byK[key] && byK[key].c === sec.dataset.c)); });
    renderPanel(key);
    draw();
    if (history.replaceState) history.replaceState(null, "", key === "root" ? location.pathname : "#" + encodeURIComponent(key));
    if (!keepScroll) document.body.classList.add("cm-sheet");
    panel.scrollTop = 0;
  }

  paintState();
  var start = decodeURIComponent((location.hash || "").slice(1));
  select(start || "root", true);
  document.body.classList.remove("cm-sheet");
  rememberKnown();
  var rt; addEventListener("resize", function(){ clearTimeout(rt); rt = setTimeout(draw, 80); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  addEventListener("keydown", function(e){ if (e.key === "Escape") document.body.classList.remove("cm-sheet"); });
  addEventListener("hashchange", function(){ select(decodeURIComponent(location.hash.slice(1)) || "root", true); });
})();
