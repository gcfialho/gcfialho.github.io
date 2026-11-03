// Motion for gcfialho.github.io.
// One orchestrated moment (the lineage replaying a real audit), plus motion that answers the reader:
// tracing lineage on hover, the nav marker following the section you read, and the timeline filling with scroll.
// The HTML is the final state, so the page is complete without JavaScript or with reduced motion.
import { animate, inView, scroll, stagger } from "motion";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const easeOut = [0.23, 1, 0.32, 1];
const easeInOut = [0.77, 0, 0.175, 1];
const SVG = "http://www.w3.org/2000/svg";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ---------- Hero text: in quickly, so it is readable before the lineage starts. ---------- */

function heroText() {
  const title = $("[data-hero-title]");
  const side = $("[data-hero-side]");
  if (reduceMotion) return;

  const words = title.textContent.trim().split(/\s+/);
  title.textContent = "";
  const spans = words.map((word, i) => {
    const span = document.createElement("span");
    span.textContent = word;
    span.style.display = "inline-block";
    span.style.opacity = "0";
    title.append(span);
    if (i < words.length - 1) title.append(" ");
    return span;
  });
  title.style.opacity = "1";
  animate(
    spans,
    { opacity: [0, 1], transform: ["translateY(0.35em)", "translateY(0)"], filter: ["blur(6px)", "blur(0px)"] },
    { duration: 0.55, delay: stagger(0.03, { startDelay: 0.05 }), ease: easeOut },
  );
  animate(side, { opacity: [0, 1], transform: ["translateY(8px)", "translateY(0)"] }, { duration: 0.5, delay: 0.3, ease: easeOut });
}

/* ---------- Lineage: draw the graph, run v1, flag it, audit, rerun, publish. ---------- */

function lineage() {
  const figure = $("[data-lineage]");
  if (!figure) return;
  const canvas = $("[data-canvas]", figure);
  const svg = $("[data-edges]", figure);
  const nodes = Object.fromEntries($$("[data-node]", figure).map((el) => [el.dataset.node, el]));
  const metric = $("[data-metric]", figure);
  const metricOld = $("[data-metric-old]", figure);
  const metricNote = $("[data-metric-note]", figure);
  const briefStatus = $("[data-brief-status]", figure);
  const checks = $$("[data-check]", figure);
  const replay = $("[data-replay]", figure);
  const gold = nodes.gold;
  const brief = nodes.brief;

  // Edges come from each node's data-upstream, so the drawing always matches the markup.
  const edges = Object.values(nodes)
    .filter((node) => node.dataset.upstream)
    .map((node) => {
      const path = document.createElementNS(SVG, "path");
      path.setAttribute("class", "edge");
      svg.append(path);
      return { from: nodes[node.dataset.upstream], to: node, path, key: `${node.dataset.upstream}>${node.dataset.node}` };
    });
  const edge = (key) => edges.find((e) => e.key === key);

  function layout() {
    const box = canvas.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    for (const e of edges) {
      // offsetLeft/Top ignore transforms, so entrance animations never bend the lines.
      const a = rect(e.from, canvas);
      const b = rect(e.to, canvas);
      let d;
      if (b.left >= a.right - 1) {
        // Side by side: leave from the right edge, arrive at the left edge.
        const x1 = a.right, y1 = a.top + a.height / 2;
        const x2 = b.left, y2 = b.top + b.height / 2;
        const dx = (x2 - x1) * 0.5;
        d = `M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      } else {
        // Stacked (narrow screens): leave from the bottom, arrive at the top.
        const x1 = a.left + a.width / 2, y1 = a.bottom;
        const x2 = b.left + b.width / 2, y2 = b.top;
        const dy = (y2 - y1) * 0.5;
        d = `M${x1} ${y1} C${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
      }
      e.path.setAttribute("d", d);
    }
  }
  layout();
  new ResizeObserver(layout).observe(canvas);

  setupTracing(figure, nodes, edges);
  if (reduceMotion) return;

  /* ----- Building blocks ----- */

  let run = 0;
  const live = new Set();
  const track = (animation) => (live.add(animation), animation);

  function drawEdge(e, delay = 0) {
    const length = e.path.getTotalLength();
    e.path.style.strokeDasharray = `${length}`;
    e.path.style.strokeDashoffset = `${length}`;
    const a = track(
      e.path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
        duration: 420, delay, easing: "cubic-bezier(0.77, 0, 0.175, 1)", fill: "both",
      }),
    );
    // Once drawn, drop the dash so later resizes never show a gap.
    a.onfinish = () => {
      e.path.style.strokeDasharray = "";
      e.path.style.strokeDashoffset = "";
      a.cancel();
    };
  }

  function pulse(e, { flagged = false, duration = 0.6, faint = false } = {}) {
    const group = document.createElementNS(SVG, "g");
    const halo = document.createElementNS(SVG, "circle");
    const dot = document.createElementNS(SVG, "circle");
    halo.setAttribute("r", "9");
    dot.setAttribute("r", "3.5");
    halo.setAttribute("class", `pulse-halo${flagged ? " is-flagged" : ""}`);
    dot.setAttribute("class", `pulse${flagged ? " is-flagged" : ""}`);
    group.append(halo, dot);
    if (faint) group.style.opacity = "0.55";
    svg.append(group);
    const place = (t) => {
      const length = e.path.getTotalLength();
      const p = e.path.getPointAtLength(t * length);
      group.setAttribute("transform", `translate(${p.x} ${p.y})`);
    };
    place(0);
    return new Promise((resolve) => {
      track(
        animate(0, 1, {
          duration,
          ease: easeInOut,
          onUpdate: place,
          onComplete: () => {
            group.animate([{ opacity: faint ? 0.55 : 1 }, { opacity: 0 }], { duration: 180 }).onfinish = () => group.remove();
            resolve();
          },
        }),
      );
    });
  }

  function glow(node) {
    node.classList.add("is-glowing");
    setTimeout(() => node.classList.remove("is-glowing"), 900);
  }

  function tick(item, delay = 0) {
    const path = $(".check-icon path", item);
    const length = path.getTotalLength();
    track(animate(item, { opacity: [0, 1], clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)"] }, { duration: 0.5, delay, ease: easeOut }));
    track(
      path.animate([{ strokeDasharray: length, strokeDashoffset: length }, { strokeDasharray: length, strokeDashoffset: 0 }], {
        duration: 320, delay: delay * 1000 + 300, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "both",
      }),
    );
  }

  /* ----- Initial state, then the story ----- */

  function reset() {
    run += 1;
    for (const a of live) {
      if (typeof a.stop === "function") a.stop();
      else if (typeof a.cancel === "function") a.cancel();
    }
    live.clear();
    $$("g", svg).forEach((g) => g.remove());
    for (const node of Object.values(nodes)) {
      node.style.opacity = "0";
      node.classList.remove("is-glowing");
    }
    for (const e of edges) {
      e.path.getAnimations().forEach((a) => a.cancel());
      e.path.style.strokeDasharray = "0 100000";
      e.path.style.strokeDashoffset = "0";
    }
    for (const item of checks) {
      item.style.opacity = "0";
      item.style.clipPath = "inset(0 100% 0 0)";
      $(".check-icon path", item).getAnimations().forEach((a) => a.cancel());
    }
    gold.dataset.state = "pending";
    metric.textContent = "–";
    metric.style.opacity = "1";
    metricOld.style.opacity = "0";
    metricNote.textContent = "Waiting for silver";
    brief.dataset.state = "pending";
    briefStatus.textContent = "Waits for checked figures.";
  }

  async function play() {
    reset();
    const id = run;
    const alive = () => id === run;

    // 1. The graph draws itself, left to right.
    const order = ["bronze", "silver", "gold", "brief", "dashboard"].map((k) => nodes[k]);
    track(
      animate(order, { opacity: [0, 1], transform: ["translateY(10px) scale(0.98)", "translateY(0) scale(1)"] }, {
        duration: 0.5,
        delay: stagger(0.12),
        ease: easeOut,
      }).then(() => {
        // Hand opacity back to the stylesheet so hover tracing can dim nodes.
        for (const node of order) {
          node.style.opacity = "";
          node.style.transform = "";
        }
      }),
    );
    edges.forEach((e, i) => drawEdge(e, 250 + i * 140));
    await sleep(1100);
    if (!alive()) return;

    // 2. First run: the number comes out, and it is wrong.
    await pulse(edge("bronze>silver"), { flagged: true });
    if (!alive()) return;
    await pulse(edge("silver>gold"), { flagged: true });
    if (!alive()) return;
    gold.dataset.state = "flagged";
    metric.textContent = "10.41";
    metricNote.textContent = "First run: flagged for audit";
    track(animate(metric, { transform: ["scale(0.92)", "scale(1)"], opacity: [0, 1] }, { duration: 0.4, ease: easeOut }));
    await sleep(900);
    if (!alive()) return;

    // 3. The audit lands in silver: two checks, ticked in turn.
    glow(nodes.silver);
    checks.forEach((item, i) => tick(item, 0.15 + i * 0.45));
    await sleep(1400);
    if (!alive()) return;

    // 4. Rerun with the fixes; the number settles where the raw data says it should.
    await pulse(edge("bronze>silver"), { duration: 0.5 });
    if (!alive()) return;
    await pulse(edge("silver>gold"), { duration: 0.5 });
    if (!alive()) return;
    gold.dataset.state = "checked";
    metricNote.textContent = "After the audit";
    glow(gold);
    await new Promise((resolve) =>
      track(
        animate(10.41, 6.34, {
          duration: 1.1,
          ease: easeInOut,
          onUpdate: (v) => (metric.textContent = v.toFixed(2)),
          onComplete: resolve,
        }),
      ),
    );
    if (!alive()) return;
    track(animate(metricOld, { opacity: [0, 1], transform: ["translateX(-6px)", "translateX(0)"] }, { duration: 0.4, ease: easeOut }));

    // 5. Only checked figures reach the brief and the dashboard.
    await Promise.all([pulse(edge("gold>brief"), { duration: 0.5 }), pulse(edge("gold>dashboard"), { duration: 0.5 })]);
    if (!alive()) return;
    brief.dataset.state = "checked";
    briefStatus.textContent = "Fact-check passed: every figure matches the warehouse.";
    glow(brief);
    replay.hidden = false;

    idle(id);
  }

  // After the story, a quiet heartbeat keeps the pipeline feeling live, only while it is on screen.
  let visible = true;
  inView(canvas, () => {
    visible = true;
    return () => (visible = false);
  });
  async function idle(id) {
    while (id === run) {
      await sleep(4200);
      if (id !== run) return;
      if (!visible || document.hidden || figure.classList.contains("is-tracing")) continue;
      await pulse(edge("bronze>silver"), { duration: 0.7, faint: true });
      if (id !== run) return;
      await pulse(edge("silver>gold"), { duration: 0.7, faint: true });
      if (id !== run) return;
      await Promise.all([
        pulse(edge("gold>brief"), { duration: 0.7, faint: true }),
        pulse(edge("gold>dashboard"), { duration: 0.7, faint: true }),
      ]);
    }
  }

  replay.addEventListener("click", () => play());
  reset();
  const stop = inView(
    canvas,
    () => {
      play();
      stop();
    },
    { amount: 0.1 }, // start as soon as it shows, so it is never an empty frame on phones
  );
}

// Layout box of an element relative to an ancestor, ignoring transforms.
function rect(element, ancestor) {
  let left = 0;
  let top = 0;
  let el = element;
  while (el && el !== ancestor) {
    left += el.offsetLeft;
    top += el.offsetTop;
    el = el.offsetParent;
  }
  return { left, top, width: element.offsetWidth, height: element.offsetHeight, right: left + element.offsetWidth, bottom: top + element.offsetHeight };
}

// Point at a model: its upstream lineage lights up and the rest steps back.
function setupTracing(figure, nodes, edges) {
  if (!finePointer) return;
  const clear = () => {
    figure.classList.remove("is-tracing");
    $$(".is-lit", figure).forEach((el) => el.classList.remove("is-lit"));
  };
  for (const node of Object.values(nodes)) {
    node.addEventListener("pointerenter", () => {
      clear();
      let current = node;
      while (current) {
        current.classList.add("is-lit");
        const parent = nodes[current.dataset.upstream];
        if (parent) edges.find((e) => e.from === parent && e.to === current)?.path.classList.add("is-lit");
        current = parent;
      }
      figure.classList.add("is-tracing");
    });
    node.addEventListener("pointerleave", clear);
  }
}

/* ---------- Header: a surface once content scrolls under it; a marker on the section in view. ---------- */

function header() {
  const bar = $("[data-header]");
  const update = () => bar.classList.toggle("is-scrolled", window.scrollY > 8);
  update();
  window.addEventListener("scroll", update, { passive: true });

  const nav = $("[data-nav]");
  const indicator = $("[data-nav-indicator]");
  const links = $$("[data-nav-link]");
  const sections = links.map((link) => $(link.getAttribute("href")));
  let active = null;

  const move = (link) => {
    if (link === active) return;
    active = link;
    links.forEach((l) => l.removeAttribute("aria-current"));
    if (!link || link.offsetParent === null) {
      indicator.style.opacity = "0";
      return;
    }
    link.setAttribute("aria-current", "true");
    const inset = 10; // align the bar with the text, not the padded hit area
    indicator.style.transform = `translateX(${link.offsetLeft + inset}px) scaleX(${link.offsetWidth - inset * 2})`;
    indicator.style.opacity = "1";
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const link = links[sections.indexOf(entry.target)];
        if (entry.isIntersecting) move(link);
        else if (active === link) move(null);
      }
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  sections.forEach((s) => s && observer.observe(s));
  window.addEventListener("resize", () => {
    const current = active;
    active = null;
    move(current);
  });
}

/* ---------- Work: the timeline fills as you read down it. ---------- */

function timeline() {
  const container = $("[data-timeline]");
  const progress = $("[data-timeline-progress]");
  if (!container || reduceMotion) return;
  progress.style.transform = "scaleY(0)";
  scroll(animate(progress, { transform: ["scaleY(0)", "scaleY(1)"] }, { ease: "linear" }), {
    target: container,
    offset: ["start 0.7", "end 0.7"],
  });
}

heroText();
lineage();
header();
timeline();
