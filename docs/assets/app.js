(function(){
  "use strict";
  var store = {
    get: function(k, d){ try{ var v = localStorage.getItem("se-guide:"+k); return v===null? d : JSON.parse(v); }catch(e){ return d; } },
    set: function(k, v){ try{ localStorage.setItem("se-guide:"+k, JSON.stringify(v)); }catch(e){} }
  };
  window.SEStore = store;
  function $(s, r){ return (r||document).querySelector(s); }
  function $$(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
  function el(tag, cls, html){ var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function txt(tag, cls, s){ var e = el(tag, cls); e.textContent = s; return e; }

  /* ---------- theme ---------- */
  var root = document.documentElement;
  $("#themeBtn").addEventListener("click", function(){
    var cur = root.getAttribute("data-theme");
    if (!cur) cur = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    var next = cur === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next); store.set("theme", next);
  });

  /* ---------- mobile nav ---------- */
  var menuBtn = $("#menuBtn");
  menuBtn.setAttribute("aria-controls", "sidebar"); menuBtn.setAttribute("aria-expanded", "false");
  function setNav(open){ document.body.classList.toggle("nav-open", open); menuBtn.setAttribute("aria-expanded", open ? "true" : "false"); }
  menuBtn.addEventListener("click", function(){ setNav(!document.body.classList.contains("nav-open")); });
  $("#scrim").addEventListener("click", function(){ setNav(false); });
  var act = $(".toc a.active"); if (act && act.scrollIntoView) { var sb = $("#sidebar"); sb.scrollTop = act.offsetTop - sb.clientHeight/2; }

  /* ---------- read state ---------- */
  var read = store.get("read", {}), seen = store.get("seen", {});
  var tocLinks = $$(".toc a[data-ch]");
  var total = tocLinks.length || 23;
  function renderRead(){
    var n = 0; for (var k in read) if (read[k]) n++;
    $$("[data-ch]").forEach(function(a){ if (a.tagName === "A") a.classList.toggle("done", !!read[a.dataset.ch]); });
    $("#readCount").textContent = n + " / " + total;
    $("#readBar").style.width = (100*n/total) + "%";
    var b = $(".readbtn");
    if (b){ var on = !!read[chapter.id]; b.classList.toggle("done", on); b.setAttribute("aria-pressed", on ? "true" : "false"); b.textContent = on ? "✓ 已读完本章" : "标记本章为已读"; }
  }
  var chapter = $("article.chapter");
  if (chapter){
    store.set("last", chapter.id);
    var foot = el("div", "ch-foot");
    var rb = el("button", "readbtn"); rb.type = "button";
    rb.addEventListener("click", function(){ read[chapter.id] = !read[chapter.id]; if (read[chapter.id]) seen[chapter.id] = true; store.set("read", read); store.set("seen", seen); renderRead(); });
    foot.appendChild(rb); chapter.appendChild(foot);
  }
  renderRead();

  /* resume link on the index page */
  var resume = $("#resume"), last = store.get("last", null);
  if (resume && last){
    var la = tocLinks.filter(function(a){ return a.dataset.ch === last; })[0];
    if (la){ var a = el("a", "resume"); a.href = la.getAttribute("href"); a.textContent = "继续阅读：第 " + last.slice(2) + " 章　" + la.querySelector(".lbl").textContent + " →"; resume.appendChild(a); }
  }

  /* ---------- scroll progress & "seen" ---------- */
  var prog = $("#progress"), seenTimer = null;
  function checkSeen(){
    if (!chapter || seen[chapter.id]) return;
    var q = chapter.querySelector(".quiz") || chapter.lastElementChild; if (!q) return;
    var r = q.getBoundingClientRect();
    if (r.top < innerHeight - 40 && r.bottom > 40){
      if (!seenTimer) seenTimer = setTimeout(function(){
        seenTimer = null; var r2 = q.getBoundingClientRect();
        if (r2.top < innerHeight - 40 && r2.bottom > 40){ seen[chapter.id] = true; store.set("seen", seen); }
      }, 900);
    }
  }
  function onScroll(){
    var h = document.documentElement.scrollHeight - innerHeight;
    prog.style.width = (h > 0 ? 100*scrollY/h : 0) + "%";
    checkSeen();
  }
  addEventListener("scroll", onScroll, {passive:true}); onScroll();

  /* ---------- glossary popover (delegated, works for content added later) ---------- */
  var pop = $("#pop"), popFor = null;
  function showPop(t){
    var g = GLOSSARY[t.dataset.t]; if (!g) return;
    pop.innerHTML = '<div class="p-zh"></div><div class="p-en"></div><div class="p-def"></div>';
    pop.querySelector(".p-zh").textContent = g[0];
    pop.querySelector(".p-en").textContent = g[1];
    pop.querySelector(".p-def").textContent = g[2];
    pop.style.display = "block";
    var r = t.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    var left = Math.min(Math.max(8, r.left + scrollX), scrollX + document.documentElement.clientWidth - pw - 8);
    var top = r.bottom + scrollY + 8;
    if (r.bottom + ph + 16 > innerHeight && r.top > ph + 16) top = r.top + scrollY - ph - 8;
    pop.style.left = left + "px"; pop.style.top = top + "px";
    if (popFor && popFor !== t) popFor.removeAttribute("aria-describedby");
    popFor = t; t.setAttribute("aria-describedby", "pop");
  }
  function hidePop(){ pop.style.display = "none"; if (popFor) popFor.removeAttribute("aria-describedby"); popFor = null; }
  function prepTerms(scope){ $$(".term[data-t]", scope).forEach(function(t){ if (!GLOSSARY[t.dataset.t]) console.warn("missing glossary", t.dataset.t); t.setAttribute("tabindex", "0"); }); }
  window.SEPrepTerms = prepTerms;
  prepTerms(document);
  var hover = matchMedia("(hover:hover)");
  document.addEventListener("mouseover", function(e){ var t = e.target.closest && e.target.closest(".term[data-t]"); if (t && hover.matches && t !== popFor) showPop(t); });
  document.addEventListener("mouseout", function(e){ var t = e.target.closest && e.target.closest(".term[data-t]"); if (t && hover.matches && !t.contains(e.relatedTarget)) hidePop(); });
  document.addEventListener("focusin", function(e){ var t = e.target.closest && e.target.closest(".term[data-t]"); if (t) showPop(t); });
  document.addEventListener("focusout", function(e){ if (e.target.closest && e.target.closest(".term[data-t]")) hidePop(); });
  // on touch screens a tap focuses the term (which opens the popover) before the click arrives,
  // so the toggle decision uses the state at pointerdown, not the state at click time
  var openAtDown = null;
  document.addEventListener("pointerdown", function(e){ var t = e.target.closest && e.target.closest(".term[data-t]"); openAtDown = t && popFor === t ? t : null; }, true);
  document.addEventListener("click", function(e){
    var t = e.target.closest && e.target.closest(".term[data-t]");
    if (t){ e.stopPropagation(); if (openAtDown === t && !hover.matches) hidePop(); else showPop(t); openAtDown = null; return; }
    if (!pop.contains(e.target)) hidePop();
  });
  document.addEventListener("keydown", function(e){
    if (e.key !== "Escape") return;
    if (popFor) hidePop();
    if (document.body.classList.contains("nav-open")){ setNav(false); menuBtn.focus(); }
  });
  addEventListener("resize", hidePop);
  function focusQuietly(x){ if (x && x.focus) try { x.focus({preventScroll:true}); } catch(err){ x.focus(); } }

  /* ---------- diagrams ---------- */
  function fillDetail(box, item){
    box.innerHTML = "";
    box.appendChild(txt("h5", "", item.title || item.label));
    box.appendChild(el("div", "", item.html));
    prepTerms(box);
  }
  $$(".diagram[data-d]").forEach(function(dg){
    var spec = DIAGRAMS[dg.dataset.d]; if (!spec) { console.warn("missing diagram", dg.dataset.d); return; }
    var hasSvg = !!dg.querySelector("svg");
    var head = el("div"); head.appendChild(txt("div", "d-title", spec.title));
    dg.insertBefore(head, dg.firstChild);
    var detail = el("div", "detail"); detail.setAttribute("aria-live", "polite");
    var items = {}, buttons = [];
    function select(k){
      buttons.forEach(function(b){ var on = b.dataset.k === k; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      fillDetail(detail, items[k]);
    }
    if (hasSvg){
      (spec.items || []).forEach(function(it){ items[it.k] = it; });
      $$(".hot[data-k]", dg).forEach(function(g){
        g.setAttribute("tabindex", "0"); g.setAttribute("role", "button");
        g.addEventListener("click", function(){ select(g.dataset.k); });
        g.addEventListener("keydown", function(e){ if (e.key === "Enter" || e.key === " "){ e.preventDefault(); select(g.dataset.k); } });
        buttons.push(g);
      });
    } else {
      var wrap = el("div", spec.layout === "ladder" ? "ladder" : ("flow" + (spec.layout === "vertical" ? " vertical" : "") + (spec.groups.length > 1 ? " stacked" : "")));
      spec.groups.forEach(function(gr){
        var gEl = el("div", "grp");
        if (gr.label) gEl.appendChild(txt("div", "grp-lbl", gr.label));
        var row = el("div", "nodes" + (spec.arrows ? " arrowrow" : ""));
        if (spec.layout === "ladder") row.style.cssText = "flex-direction:column;width:" + (gr.width || "100%");
        gr.nodes.forEach(function(n){
          items[n.k] = n;
          var b = el("button", "node"); b.type = "button"; b.dataset.k = n.k;
          b.appendChild(txt("span", "", n.label));
          if (n.sub) b.appendChild(txt("small", "", n.sub));
          b.addEventListener("click", function(){ select(n.k); });
          row.appendChild(b); buttons.push(b);
        });
        gEl.appendChild(row);
        wrap.appendChild(spec.layout === "ladder" ? row : gEl);
      });
      dg.appendChild(wrap);
    }
    dg.appendChild(detail);
    if (buttons.length) select(spec.initial && items[spec.initial] ? spec.initial : buttons[0].dataset.k);
  });

  /* ---------- scenario simulations ---------- */
  $$(".sim[data-sim]").forEach(function(box){
    var spec = SIMS[box.dataset.sim]; if (!spec) { console.warn("missing sim", box.dataset.sim); return; }
    box.appendChild(txt("div", "w-title", spec.title));
    if (spec.intro) box.appendChild(el("div", "sim-intro", spec.intro));
    var stage = el("div", "sim-stage"); box.appendChild(stage);
    function run(id, moveFocus){
      var node = spec.nodes[id]; if (!node) { console.warn("missing sim node", id); return; }
      var step = el("div", "sim-step" + (node.end ? " end tone-" + (node.tone || "neutral") : ""));
      var stText = el("div", "sim-text", node.text); step.appendChild(stText);
      if (node.end){
        var again = el("button", "btn"); again.type = "button"; again.textContent = "重新开始";
        again.addEventListener("click", function(){ stage.innerHTML = ""; run(spec.start, true); stage.firstChild.scrollIntoView({block:"nearest"}); });
        step.appendChild(el("div", "sim-actions")).appendChild(again);
      } else {
        var opts = el("div", "sim-choices");
        node.choices.forEach(function(c){
          var b = el("button", "sim-choice"); b.type = "button"; b.textContent = c.t;
          b.addEventListener("click", function(){
            $$(".sim-choice", opts).forEach(function(x){ x.disabled = true; });
            b.classList.add("picked", "tone-" + (c.tone || "neutral"));
            if (c.fb){ var fb = el("div", "sim-fb tone-" + (c.tone || "neutral"), c.fb); step.appendChild(fb); prepTerms(fb); }
            if (c.next){
              var go = el("button", "btn pri"); go.type = "button"; go.textContent = c.goLabel || "继续";
              var act = el("div", "sim-actions"); act.appendChild(go); step.appendChild(act);
              go.addEventListener("click", function(){ act.remove(); run(c.next, true); });
              focusQuietly(go);
            }
          });
          opts.appendChild(b);
        });
        step.appendChild(opts);
      }
      stage.appendChild(step); prepTerms(step);
      if (stage.children.length > 1) step.scrollIntoView({block:"nearest", behavior:"smooth"});
      if (moveFocus){
        // keep keyboard focus inside the scenario: the next choice, or the outcome text at an end node
        if (node.end){ stText.setAttribute("tabindex", "-1"); focusQuietly(stText); }
        else focusQuietly(step.querySelector(".sim-choice"));
      }
    }
    run(spec.start);
  });

  /* ---------- classification exercises ---------- */
  $$(".sorter[data-sort]").forEach(function(box){
    var spec = SORTS[box.dataset.sort]; if (!spec) { console.warn("missing sort", box.dataset.sort); return; }
    box.appendChild(txt("div", "w-title", spec.title));
    if (spec.prompt) box.appendChild(el("div", "sort-prompt", spec.prompt));
    var list = el("div", "sort-list"); box.appendChild(list);
    function build(){
      list.innerHTML = "";
      spec.items.forEach(function(it){
        var ok = [].concat(it.c);
        var row = el("div", "sort-item");
        row.appendChild(el("div", "sort-t", it.t));
        var chips = el("div", "sort-cats");
        spec.cats.forEach(function(cat){
          var b = el("button", "chipbtn"); b.type = "button"; b.textContent = cat.label;
          b.addEventListener("click", function(){
            var right = ok.indexOf(cat.k) >= 0;
            $$(".chipbtn", chips).forEach(function(x){ x.disabled = true; });
            b.classList.add(right ? "right" : "wrong");
            if (!right) $$(".chipbtn", chips).forEach(function(x, j){ if (ok.indexOf(spec.cats[j].k) >= 0) x.classList.add("right"); });
            row.classList.add(right ? "is-right" : "is-wrong");
            var w = el("div", "sort-why", it.why || ""); w.setAttribute("tabindex", "-1");
            var verdict = txt("span", "sr-only", right ? "回答正确。" : "回答错误，应选：" + spec.cats.filter(function(c){ return ok.indexOf(c.k) >= 0; }).map(function(c){ return c.label; }).join("、") + "。");
            w.insertBefore(verdict, w.firstChild);
            if (!it.why) w.style.display = "none";
            row.appendChild(w); prepTerms(w);
            if (it.why) focusQuietly(w);
          });
          chips.appendChild(b);
        });
        row.appendChild(chips); list.appendChild(row);
      });
      prepTerms(list);
    }
    build();
    var r = el("button", "btn"); r.type = "button"; r.textContent = "重新作答"; r.addEventListener("click", function(){ build(); focusQuietly(list.querySelector(".chipbtn")); });
    box.appendChild(el("div", "w-foot")).appendChild(r);
  });

  /* ---------- step-through walkthroughs ---------- */
  $$(".stepper[data-step]").forEach(function(box){
    var spec = STEPS[box.dataset.step]; if (!spec) { console.warn("missing stepper", box.dataset.step); return; }
    var head = txt("div", "w-title", spec.title); box.insertBefore(head, box.firstChild);
    var nav = el("div", "st-nav"), detail = el("div", "detail"), cur = 0, btns = [];
    detail.setAttribute("aria-live", "polite");
    var prev = el("button", "btn"); prev.type = "button"; prev.textContent = "‹ 上一步";
    var next = el("button", "btn pri"); next.type = "button"; next.textContent = "下一步 ›";
    var dots = el("div", "st-dots");
    spec.steps.forEach(function(s, i){
      var d = el("button", "st-dot"); d.type = "button"; d.textContent = s.label || (i+1);
      d.addEventListener("click", function(){ go(i); }); dots.appendChild(d); btns.push(d);
    });
    prev.addEventListener("click", function(){ go(cur-1); });
    next.addEventListener("click", function(){ go(cur+1); });
    nav.appendChild(prev); nav.appendChild(dots); nav.appendChild(next);
    box.appendChild(nav); box.appendChild(detail);
    function has(attr, n){ return (attr || "").split(/[\s,]+/).indexOf(String(n)) >= 0; }
    function go(i){
      cur = Math.max(0, Math.min(spec.steps.length-1, i));
      var n = cur + 1;
      btns.forEach(function(b, j){ b.classList.toggle("on", j === cur); b.classList.toggle("past", j < cur); b.setAttribute("aria-pressed", j === cur); });
      prev.disabled = cur === 0; next.disabled = cur === spec.steps.length-1;
      $$("[data-s]", box).forEach(function(x){ x.classList.toggle("st-hide", n < +x.getAttribute("data-s")); });
      $$("[data-only]", box).forEach(function(x){ x.classList.toggle("st-hide", !has(x.getAttribute("data-only"), n)); });
      $$("[data-on]", box).forEach(function(x){ x.classList.toggle("st-on", has(x.getAttribute("data-on"), n)); });
      var s = spec.steps[cur];
      detail.innerHTML = ""; if (s.title || s.label) detail.appendChild(txt("h5", "", s.title || s.label));
      detail.appendChild(el("div", "", s.html)); prepTerms(detail);
      if (spec.onStep) try { spec.onStep(n, box); } catch(e){ console.warn(e); }
    }
    go(0);
  });

  /* ---------- quizzes ---------- */
  var answers = store.get("quiz", {});
  var LET = "ABCD";
  $$(".quiz[data-ch]").forEach(function(box){
    var ch = box.dataset.ch, qs = QUIZ[ch]; if (!qs) { console.warn("missing quiz", ch); return; }
    var head = el("div", "quiz-head", '<span>本章小测验</span><span class="score"></span>'); box.appendChild(head);
    var qEls = [];
    function score(){
      var done = 0, right = 0;
      qs.forEach(function(q, i){ var a = answers[ch+"-"+i]; if (a !== undefined){ done++; if (a === q.a) right++; } });
      head.querySelector(".score").textContent = done ? ("答对 " + right + " / " + qs.length) : "";
    }
    function paint(i){
      var q = qs[i], qe = qEls[i], a = answers[ch+"-"+i];
      $$(".opt", qe).forEach(function(o, j){
        o.classList.remove("right", "wrong"); o.disabled = a !== undefined;
        if (a !== undefined){ if (j === q.a) o.classList.add("right"); else if (j === a) o.classList.add("wrong"); }
      });
      qe.classList.toggle("answered", a !== undefined);
      var ex = qe.querySelector(".explain");
      if (a !== undefined){ ex.innerHTML = "<b>" + (a === q.a ? "回答正确。" : "正确答案是 " + LET[q.a] + "。") + "</b> "; ex.appendChild(document.createTextNode(q.e)); }
    }
    qs.forEach(function(q, i){
      var qe = el("div", "q");
      var t = el("div", "q-text", '<span class="qn">' + (i+1) + '.</span>'); t.appendChild(document.createTextNode(q.q)); qe.appendChild(t);
      q.o.forEach(function(s, j){
        var b = el("button", "opt", '<span class="ol">' + LET[j] + '</span><span></span>'); b.type = "button";
        b.lastChild.textContent = s;
        b.addEventListener("click", function(){ answers[ch+"-"+i] = j; store.set("quiz", answers); paint(i); score(); focusQuietly(qe.querySelector(".explain")); });
        qe.appendChild(b);
      });
      var ex = el("div", "explain"); ex.setAttribute("tabindex", "-1"); qe.appendChild(ex);
      box.appendChild(qe); qEls.push(qe); paint(i);
    });
    var f = el("div", "quiz-foot");
    var r = el("button", "btn"); r.type = "button"; r.textContent = "重新作答";
    r.addEventListener("click", function(){ qs.forEach(function(q, i){ delete answers[ch+"-"+i]; paint(i); }); store.set("quiz", answers); score(); focusQuietly(qEls[0] && qEls[0].querySelector(".opt")); });
    f.appendChild(r); box.appendChild(f);
    score();
  });

  document.dispatchEvent(new CustomEvent("se:ready"));
})();
