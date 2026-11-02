// Drives the home page route line. Without this script the page still reads
// fine: the line stays unfilled and the cab stays off screen.
(function () {
  // Certifications stay closed until asked for, including from the top bar.
  const certs = document.querySelector(".certs");
  if (certs) {
    if (location.hash === "#certifications") certs.open = true;
    document.querySelectorAll('a[href="#certifications"]').forEach((link) => {
      link.addEventListener("click", () => {
        certs.open = true;
      });
    });
  }

  // Send the contact form without leaving the page. If this script doesn't
  // run, the form still posts to Formspree the normal way.
  const form = document.querySelector(".contact-form");
  if (form) {
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
  }

  const route = document.querySelector(".route");
  const rail = document.querySelector(".rail");
  const stops = [...document.querySelectorAll(".stop")];
  const terminal = document.querySelector(".stop--end");
  const road = document.querySelector(".road");
  const taxi = document.querySelector(".taxi");
  if (!route || !rail || !terminal || !road || !taxi) return;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (value) => Math.min(Math.max(value, 0), 1);

  // Center of a station marker, measured from the top of the route.
  function markerY(stop) {
    const marker = getComputedStyle(stop, "::before");
    return stop.offsetTop + parseFloat(marker.top) + parseFloat(marker.height) / 2;
  }

  // Stop the line at the terminal instead of the bottom of the page.
  function measure() {
    const end = route.offsetHeight - markerY(terminal);
    route.style.setProperty("--rail-end", `${end}px`);
  }

  function updateLine(viewport, maxScroll) {
    if (reducedMotion.matches) {
      route.style.setProperty("--progress", 1);
      stops.forEach((stop) => stop.classList.add("is-reached"));
      return;
    }

    // The point on the screen the train follows slides from 40% of the way
    // down to the very bottom, so the train always reaches the terminal.
    const scrolled = maxScroll > 0 ? clamp(scrollY / maxScroll) : 1;
    const follow = scrollY + viewport * (0.4 + 0.6 * scrolled);
    const routeTop = route.getBoundingClientRect().top + scrollY;
    const trainY = Math.min(follow - routeTop, rail.offsetHeight);

    route.style.setProperty("--progress", clamp(trainY / rail.offsetHeight));
    stops.forEach((stop) => {
      stop.classList.toggle("is-reached", trainY >= markerY(stop) - 1);
    });
  }

  function updateTaxi(viewport, maxScroll) {
    const roadBox = road.getBoundingClientRect();
    const taxiWidth = taxi.offsetWidth;
    const parked = roadBox.width - taxiWidth;
    const offScreen = -(roadBox.left + taxiWidth + 20);

    // Drive in while the road rises up the screen, and be parked by the time
    // the page can't scroll any further.
    const start = viewport;
    const lowestTop = roadBox.top + scrollY - maxScroll;
    const end = Math.max(viewport * 0.45, lowestTop);
    const trip =
      reducedMotion.matches || start <= end
        ? 1
        : clamp((start - roadBox.top) / (start - end));

    const x = offScreen + (parked - offScreen) * trip;
    const wheelDiameter = taxiWidth * (32 / 220); // from the SVG's viewBox
    const turns = (x - offScreen) / (Math.PI * wheelDiameter);

    taxi.style.setProperty("--taxi-x", `${x}px`);
    taxi.style.setProperty("--wheel", `${turns * 360}deg`);
  }

  function update() {
    const viewport = innerHeight;
    const maxScroll = document.documentElement.scrollHeight - viewport;
    updateLine(viewport, maxScroll);
    updateTaxi(viewport, maxScroll);
  }

  let queued = false;
  function queueUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  }

  function remeasure() {
    measure();
    queueUpdate();
  }

  addEventListener("scroll", queueUpdate, { passive: true });
  addEventListener("resize", remeasure);
  reducedMotion.addEventListener("change", update);

  // Images and fonts change the page height as they load.
  new ResizeObserver(remeasure).observe(route);

  // On arrival the train glides from the start of the line to its position.
  measure();
  if (reducedMotion.matches) {
    update();
  } else {
    route.classList.add("is-arriving");
    requestAnimationFrame(() => requestAnimationFrame(update));
    setTimeout(() => route.classList.remove("is-arriving"), 1100);
  }
})();
