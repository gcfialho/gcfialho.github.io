// Motion for gcfialho.github.io. One language throughout: a blue pencil that corrects,
// ticks and underlines. Everything here is decorative and the page works without it.
import { animate, inView, scroll, stagger } from "motion";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const easeOut = [0.23, 1, 0.32, 1];
const easeInOut = [0.77, 0, 0.175, 1];
const overshoot = [0.34, 1.4, 0.64, 1]; // a light, spring-like settle for the corrected number

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/* ---------- Hero: write the wrong number, strike it, write the right one. ---------- */

function splitWords(element) {
  const words = element.textContent.trim().split(/\s+/);
  element.textContent = "";
  return words.map((word, i) => {
    const span = document.createElement("span");
    span.textContent = word;
    span.style.display = "inline-block";
    element.append(span);
    if (i < words.length - 1) element.append(" ");
    return span;
  });
}

function heroSequence() {
  const old = $("[data-hero-old]");
  const fresh = $("[data-hero-new]");
  const note = $("[data-hero-note]");
  const title = $("[data-hero-title]");
  const intro = $("[data-hero-intro]");
  const links = $("[data-hero-links]");

  if (reduceMotion) {
    old.classList.add("is-struck");
    for (const el of [old, fresh, note, title, intro, links]) el.style.opacity = "1";
    return;
  }

  animate(old, { opacity: [0, 1], transform: ["translateY(0.12em)", "translateY(0)"] }, { duration: 0.5, ease: easeOut });
  setTimeout(() => old.classList.add("is-struck"), 420);
  animate(
    fresh,
    { opacity: [0, 1], filter: ["blur(10px)", "blur(0px)"], transform: ["translateX(-0.12em) scale(0.96)", "translateX(0) scale(1)"] },
    { duration: 0.7, delay: 0.95, ease: overshoot },
  );
  animate(note, { opacity: [0, 1] }, { duration: 0.5, delay: 1.25, ease: "ease-out" });

  const words = splitWords(title);
  for (const word of words) word.style.opacity = "0";
  title.style.opacity = "1";
  animate(
    words,
    { opacity: [0, 1], filter: ["blur(6px)", "blur(0px)"], transform: ["translateY(0.3em)", "translateY(0)"] },
    { duration: 0.55, delay: stagger(0.045, { startDelay: 1.35 }), ease: easeOut },
  );
  animate([intro, links], { opacity: [0, 1], transform: ["translateY(10px)", "translateY(0)"] }, {
    duration: 0.6,
    delay: stagger(0.08, { startDelay: 1.75 }),
    ease: easeOut,
  });
}

/* ---------- Projects: a pencil line drawn by scroll, notes written and ticked in view. ---------- */

const TICK = `<svg class="tick" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5 8.2 14.5 16 5.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function projects() {
  const section = $("#projects");
  const line = $("[data-margin-line]");

  if (!reduceMotion && line) {
    scroll(animate(line, { transform: ["scaleY(0)", "scaleY(1)"] }, { ease: "linear" }), {
      target: section,
      offset: ["start 0.75", "end 0.75"],
    });
  } else if (line) {
    line.style.transform = "scaleY(1)";
  }

  for (const project of $$("[data-project]")) {
    const note = $("[data-note]", project);
    note.insertAdjacentHTML("afterbegin", TICK);
    const path = $(".tick path", note);
    const length = path.getTotalLength();
    const inlineOld = $("[data-inline-old]", note);

    if (reduceMotion) {
      inlineOld?.classList.add("is-struck");
      continue;
    }

    note.style.clipPath = "inset(0 100% 0 0)";
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    const stop = inView(
      project,
      () => {
        animate(note, { clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)"] }, { duration: 0.9, ease: easeInOut });
        animate(path, { strokeDashoffset: [length, 0] }, { duration: 0.45, delay: 0.75, ease: easeOut });
        if (inlineOld) setTimeout(() => inlineOld.classList.add("is-struck"), 900);
        stop();
      },
      { amount: 0.45 },
    );

    spotlight(project);
  }
}

// Spring-smoothed pointer spotlight. Writes a transform-free CSS variable on the row only.
function spotlight(element) {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  let target = { x: 0, y: 0 };
  let current = { x: 0, y: 0 };
  let velocity = { x: 0, y: 0 };
  let frame = 0;
  const stiffness = 0.12;
  const damping = 0.72;

  const step = () => {
    for (const axis of ["x", "y"]) {
      velocity[axis] = (velocity[axis] + (target[axis] - current[axis]) * stiffness) * damping;
      current[axis] += velocity[axis];
    }
    element.style.setProperty("--spot-x", `${current.x}px`);
    element.style.setProperty("--spot-y", `${current.y}px`);
    const moving = Math.abs(velocity.x) + Math.abs(velocity.y) > 0.1;
    frame = moving ? requestAnimationFrame(step) : 0;
  };

  element.addEventListener("pointerenter", (event) => {
    const box = element.getBoundingClientRect();
    current = { x: event.clientX - box.left, y: event.clientY - box.top };
    target = { ...current };
  });
  element.addEventListener("pointermove", (event) => {
    const box = element.getBoundingClientRect();
    target = { x: event.clientX - box.left, y: event.clientY - box.top };
    if (!frame) frame = requestAnimationFrame(step);
  });
}

/* ---------- Everything else: a quiet reveal, once. ---------- */

function reveals() {
  for (const element of $$("[data-reveal]")) {
    if (reduceMotion) continue;
    element.style.opacity = "0";
    const stop = inView(
      element,
      () => {
        animate(element, { opacity: [0, 1], transform: ["translateY(16px)", "translateY(0)"] }, { duration: 0.6, ease: easeOut });
        stop();
      },
      { amount: 0.25 },
    );
  }
}

function header() {
  const bar = $("[data-header]");
  const update = () => bar.classList.toggle("is-scrolled", window.scrollY > 8);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

heroSequence();
projects();
reveals();
header();
