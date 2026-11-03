// SKETCH HOME PAGE (curved route with a red pin)
// 1. The route: a gently curving line in the left margin with a pin that travels it.
//    Each place is a station; it fills in once the pin arrives.
// 2. The backdrops drift very slowly as you scroll (skipped for reduced motion).
// 3. At the end, a taxi drives in as the New York section arrives and parks at the right.
// 4. The contact form sends without leaving the page.

// Send the contact form in place. If this script doesn't run, the form still
// posts to Formspree the normal way.
(() => {
  const form = document.querySelector(".contact-form");
  if (!form) return;
  const status = form.querySelector(".contact-form__status");
  const send = form.querySelector("button");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    send.disabled = true;
    status.textContent = "Sending...";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(response.statusText);
      form.reset();
      status.textContent = "Thanks! Your message is on its way.";
    } catch {
      status.textContent = "That didn't send. Please try again.";
    }
    send.disabled = false;
  });
})();

(() => {
  const journey = document.querySelector(".journey");
  const svg = journey && journey.querySelector(".trail");
  if (!svg) return;

  document.documentElement.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (n, lo = 0, hi = 1) => Math.min(Math.max(n, lo), hi);
  const NS = "http://www.w3.org/2000/svg";
  const make = (tag, attrs = {}) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };

  const stops = [...journey.querySelectorAll("[data-stop]")];
  const intro = journey.querySelector("[data-intro]");
  const pan = journey.querySelector("[data-pan]");
  const backdrops = [...journey.querySelectorAll(".place__bg")];
  const road = journey.querySelector(".road");
  const taxi = road && road.querySelector(".taxi");

  let donePath = null;
  let pin = null;
  let stopDots = [];
  let stopYs = [];
  let table = []; // [y, length] samples so a scroll position maps to a spot on the line
  let total = 0;

  // a smooth curve through the points (Catmull-Rom converted to cubic beziers)
  function smooth(points) {
    let d = `M${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }

  function buildTrail() {
    const top = journey.getBoundingClientRect().top + window.scrollY;
    const w = window.innerWidth;
    const gutter = w >= 1000 ? 56 : w >= 700 ? 40 : 26;
    const wiggle = w >= 1000 ? 16 : w >= 700 ? 11 : 7;

    svg.setAttribute("viewBox", `0 0 ${journey.offsetWidth} ${journey.offsetHeight}`);
    svg.replaceChildren();

    stopYs = stops.map(
      (s) => s.getBoundingClientRect().top + window.scrollY - top + (s.dataset.stopOffset !== undefined ? parseFloat(s.dataset.stopOffset) : 46)
    );
    const startY = stopYs[0];
    const endY = stopYs[stopYs.length - 1];

    // stops sit on the margin line; between them the route drifts left and right
    const ys = [...stopYs];
    for (let y = startY + 260; y < endY - 120; y += 260) {
      if (stopYs.every((sy) => Math.abs(sy - y) > 130)) ys.push(y);
    }
    ys.sort((a, b) => a - b);
    const points = ys.map((y, i) => [stopYs.includes(y) ? gutter : gutter + Math.sin(i * 1.9) * wiggle, y]);
    const d = smooth(points);

    svg.append(make("path", { d, class: "trail__base" }));
    donePath = make("path", { d, class: "trail__done" });
    svg.append(donePath);

    total = donePath.getTotalLength();
    donePath.style.strokeDasharray = `0 ${total}`;
    table = [];
    for (let len = 0; len <= total; len += 6) table.push([donePath.getPointAtLength(len).y, len]);

    stopDots = stopYs.map((sy) => {
      const len = (table.find((row) => row[0] >= sy) || table[table.length - 1])[1];
      const p = donePath.getPointAtLength(len);
      const dot = make("circle", { cx: p.x, cy: p.y, r: 9, class: "trail__stop" });
      svg.append(dot);
      return dot;
    });

    pin = make("g");
    pin.append(
      make("path", { class: "trail__pin", d: "M0,0 C-10,-14 -12,-20 -12,-25 A12,12 0 1 1 12,-25 C12,-20 10,-14 0,0 Z" }),
      make("circle", { class: "trail__pin-dot", cx: 0, cy: -25, r: 4.5 })
    );
    svg.append(pin);

    update();
  }

  function update() {
    const vh = window.innerHeight;
    const y = window.scrollY;

    // route
    if (donePath && table.length) {
      const top = journey.getBoundingClientRect().top + y;
      const pointer = y + vh * 0.55 - top;
      const row = table.find((r) => r[0] >= pointer) || table[table.length - 1];
      const len = pointer <= table[0][0] ? 0 : row[1];
      const p = donePath.getPointAtLength(len);
      donePath.style.strokeDasharray = `${len} ${total}`;
      pin.setAttribute("transform", `translate(${p.x},${p.y})`);
      stopDots.forEach((dot, i) => dot.classList.toggle("is-reached", pointer >= stopYs[i]));
    }

    // PathForward's screenshot slides sideways as its chapter crosses the screen
    if (pan && !reduceMotion) {
      const box = pan.getBoundingClientRect();
      const p = clamp((vh - box.top) / (vh + box.height));
      pan.style.setProperty("--pan", `${(-p * 26).toFixed(1)}%`);
    }

    // slow drift of the backdrops
    backdrops.forEach((bg) => {
      if (reduceMotion) return;
      const box = bg.parentElement.getBoundingClientRect();
      const shift = clamp(((box.top + box.height / 2 - vh / 2) / vh) * -0.12, -0.12, 0.12) * vh * 0.5;
      bg.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
    });

    // the taxi drives in from the left, then parks near the right edge
    if (taxi) {
      const box = road.getBoundingClientRect();
      const cab = taxi.offsetWidth;
      const startX = -box.left - cab;
      const endX = window.innerWidth * 0.94 - cab - box.left;
      const from = box.top + y - vh;
      const to = Math.max(document.documentElement.scrollHeight - vh, from + 1);
      const p = reduceMotion ? 1 : clamp((y - from) / (to - from));
      taxi.style.setProperty("--taxi-x", `${startX + (endX - startX) * p}px`);
      taxi.style.setProperty("--wheel", `${p * 2600}deg`);
    }
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }

  if (intro) {
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries, obs) => {
        if (entries.some((e) => e.isIntersecting)) {
          intro.classList.add("is-in");
          obs.disconnect();
        }
      }, { threshold: 0.3 }).observe(intro);
    } else {
      intro.classList.add("is-in");
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", buildTrail);
  window.addEventListener("load", buildTrail);
  if ("ResizeObserver" in window) new ResizeObserver(buildTrail).observe(journey);
  buildTrail();
})();
