/* CASE STUDY MOTION
   Loaded on case study pages. Each piece only runs if its markup is on the page.
   1. Carousel: click, swipe or arrow-key through screens (data-carousel)
   2. Compare slider: drag between a wireframe and the final design (data-compare)
   3. Route progress: the line beside the sections fills as you read
   4. Count-up numbers and growing bars in the survey results
   5. Gentle reveal: figures fade up as they scroll into view

   People who turn on "reduce motion" get everything working, just without animation.
   Without JavaScript, the page shows every element in its final state. */

(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // CSS hides elements for the reveal and grow effects only when this class is set
    if (!reduceMotion) {
        document.documentElement.classList.add("motion");
    }

    // Runs a callback once, the first time each element scrolls into view
    function onceVisible(elements, callback, threshold = 0.2) {
        if (!("IntersectionObserver" in window)) {
            elements.forEach(callback);
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    observer.unobserve(entry.target);
                    callback(entry.target);
                }
            });
        }, { threshold });
        elements.forEach((el) => observer.observe(el));
    }

    /* * * * * * * * * * * * * * * * * * * * * * * * *
        1. CAROUSEL
    * * * * * * * * * * * * * * * * * * * * * * * * */

    function initCarousel(root) {
        const track = root.querySelector(".carousel__track");
        const slides = [...track.querySelectorAll(".carousel__slide")];
        const prev = root.querySelector("[data-prev]");
        const next = root.querySelector("[data-next]");
        const dotsWrap = root.querySelector(".carousel__dots");
        const status = root.querySelector(".carousel__status");
        let current = -1;

        // one dot per slide
        const dots = slides.map((slide, i) => {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "carousel__dot";
            dot.setAttribute("aria-label", `Show screen ${i + 1}: ${slide.dataset.title}`);
            dot.addEventListener("click", () => goTo(i));
            dotsWrap.append(dot);
            return dot;
        });

        function goTo(i) {
            const slide = slides[Math.max(0, Math.min(slides.length - 1, i))];
            const left = slide.offsetLeft + slide.offsetWidth / 2 - track.clientWidth / 2;
            track.scrollTo({ left, behavior: reduceMotion ? "auto" : "smooth" });
        }

        function setCurrent(i) {
            if (i === current) return;
            current = i;
            slides.forEach((slide, n) => slide.classList.toggle("is-active", n === i));
            dots.forEach((dot, n) => dot.toggleAttribute("aria-current", n === i));
            prev.disabled = i === 0;
            next.disabled = i === slides.length - 1;
            const s = slides[i];
            status.innerHTML = `<strong>${i + 1} of ${slides.length} · ${s.dataset.title}:</strong> ${s.dataset.caption}`;
        }

        // the active slide is whichever is closest to the middle of the track
        function findCurrent() {
            const middle = track.scrollLeft + track.clientWidth / 2;
            let best = 0;
            let bestDistance = Infinity;
            slides.forEach((slide, i) => {
                const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - middle);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    best = i;
                }
            });
            setCurrent(best);
        }

        let ticking = false;
        track.addEventListener("scroll", () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                findCurrent();
                ticking = false;
            });
        }, { passive: true });

        prev.addEventListener("click", () => goTo(current - 1));
        next.addEventListener("click", () => goTo(current + 1));

        // clicking a side screen brings it to the middle
        slides.forEach((slide, i) => {
            slide.addEventListener("click", () => {
                if (i !== current) goTo(i);
            });
        });

        track.addEventListener("keydown", (event) => {
            if (event.key === "ArrowRight") {
                event.preventDefault();
                goTo(current + 1);
            } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                goTo(current - 1);
            }
        });

        setCurrent(0);
        root.classList.add("is-ready");
    }

    document.querySelectorAll("[data-carousel]").forEach(initCarousel);

    /* * * * * * * * * * * * * * * * * * * * * * * * *
        2. COMPARE SLIDER
    * * * * * * * * * * * * * * * * * * * * * * * * */

    function initCompare(root) {
        const range = root.querySelector(".compare__range");
        const set = (value) => root.style.setProperty("--pos", `${value}%`);
        range.addEventListener("input", () => set(range.value));

        // a one-time nudge when it first appears, so people notice it moves
        if (!reduceMotion) {
            onceVisible([root], () => {
                const keyframes = [50, 30, 70, 50];
                let step = 0;
                const tick = () => {
                    if (step >= keyframes.length) return;
                    set(keyframes[step]);
                    range.value = keyframes[step];
                    step += 1;
                    setTimeout(tick, 450);
                };
                root.classList.add("is-nudging");
                setTimeout(tick, 400);
                setTimeout(() => root.classList.remove("is-nudging"), 400 + 450 * keyframes.length);
            }, 0.6);
        }
    }

    document.querySelectorAll("[data-compare]").forEach(initCompare);

    /* * * * * * * * * * * * * * * * * * * * * * * * *
        3. ROUTE PROGRESS
        The line runs between the first and last station; it fills up to
        the middle of the screen, and each station fills once the line reaches it.
    * * * * * * * * * * * * * * * * * * * * * * * * */

    const route = document.querySelector(".steps");

    if (route) {
        const stations = [...route.querySelectorAll(".step")];
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        let ticking = false;

        function updateRoute() {
            const box = route.getBoundingClientRect();
            const start = box.top + 3.5 * rem;
            const length = box.height - 7 * rem;
            const marker = window.innerHeight * 0.55;
            const progress = Math.min(1, Math.max(0, (marker - start) / length));
            route.style.setProperty("--progress", progress.toFixed(4));

            stations.forEach((station) => {
                const dot = station.getBoundingClientRect().top + 3.5 * rem;
                station.classList.toggle("is-reached", dot <= marker);
            });
            ticking = false;
        }

        const request = () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(updateRoute);
            }
        };

        route.classList.add("has-progress");
        window.addEventListener("scroll", request, { passive: true });
        window.addEventListener("resize", request);
        updateRoute();
    }

    /* * * * * * * * * * * * * * * * * * * * * * * * *
        4. COUNT-UP NUMBERS AND GROWING BARS
    * * * * * * * * * * * * * * * * * * * * * * * * */

    const counters = [...document.querySelectorAll(".stats dd")];

    if (counters.length && !reduceMotion) {
        counters.forEach((dd) => {
            const target = parseInt(dd.textContent, 10);
            if (Number.isNaN(target)) return;
            // screen readers get the real number; the animated one is hidden from them
            dd.dataset.target = target;
            dd.innerHTML = `<span aria-hidden="true">0</span><span class="sr-only">${target}</span>`;
        });

        onceVisible(counters, (dd) => {
            const target = Number(dd.dataset.target);
            const shown = dd.querySelector("[aria-hidden]");
            if (!shown) return;
            const duration = 1100;
            const startTime = performance.now();
            const frame = (now) => {
                const t = Math.min(1, (now - startTime) / duration);
                const eased = 1 - Math.pow(1 - t, 3);
                shown.textContent = Math.round(target * eased);
                if (t < 1) requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
        }, 0.5);
    }

    // bars grow from zero (the CSS handles the animation once .is-in is added)
    onceVisible([...document.querySelectorAll(".charts")], (el) => el.classList.add("is-in"), 0.3);

    /* * * * * * * * * * * * * * * * * * * * * * * * *
        BACK TO TOP
        The button fades in once you've scrolled past the first screen. While it's
        hidden, it's also skipped by the keyboard and screen readers.
    * * * * * * * * * * * * * * * * * * * * * * * * */

    const toTop = document.querySelector(".to-top");

    if (toTop) {
        toTop.classList.add("is-ready");
        let shown = null;

        const updateToTop = () => {
            const show = window.scrollY > window.innerHeight * 0.8;
            if (show === shown) return;
            shown = show;
            toTop.classList.toggle("is-visible", show);
            toTop.toggleAttribute("aria-hidden", !show);
            toTop.tabIndex = show ? 0 : -1;
        };

        toTop.addEventListener("click", (event) => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
            // let go of focus, so the next Tab starts from the top of the page
            toTop.blur();
        });

        window.addEventListener("scroll", updateToTop, { passive: true });
        updateToTop();
    }

    /* * * * * * * * * * * * * * * * * * * * * * * * *
        5. GENTLE REVEAL
    * * * * * * * * * * * * * * * * * * * * * * * * */

    if (!reduceMotion) {
        const revealables = [...document.querySelectorAll(
            ".step > .step__figure, .step > .compare-figure, .stats, .charts, .quotes, .findings, .team, .duo, .split, .rounds, .glance"
        )];
        revealables.forEach((el) => el.classList.add("reveal"));
        onceVisible(revealables, (el) => el.classList.add("is-in"), 0.12);
    }

    /* * * * * * * * * * * * * * * * * * * * * * * * *
        LIGHTBOX
        Any image wrapped in a link to an image file opens large on this page
        instead of in a new tab. Close with the button, Esc or a click outside
        the image. Without JavaScript the link still opens the image in a new tab.
    * * * * * * * * * * * * * * * * * * * * * * * * */

    const imageLinks = [...document.querySelectorAll("a[href]")].filter(
        (a) => /\.(jpe?g|png|webp|gif)$/i.test(a.getAttribute("href")) && a.querySelector("img")
    );

    if (imageLinks.length && typeof HTMLDialogElement === "function") {
        const box = document.createElement("dialog");
        box.className = "lightbox";
        box.setAttribute("aria-label", "Enlarged image");
        box.innerHTML =
            '<button class="lightbox__close" type="button" aria-label="Close">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>' +
            "</button>" +
            '<img class="lightbox__img" alt="" />' +
            '<p class="lightbox__caption"></p>';
        // inside the case study, so the frame picks up the project color
        (document.querySelector(".case") || document.body).append(box);

        const img = box.querySelector(".lightbox__img");
        const caption = box.querySelector(".lightbox__caption");

        imageLinks.forEach((link) => {
            link.classList.add("zoomable");
            link.removeAttribute("target");
            link.setAttribute("aria-haspopup", "dialog");
            link.addEventListener("click", (event) => {
                event.preventDefault();
                const thumb = link.querySelector("img");
                img.src = link.getAttribute("href");
                img.alt = thumb.alt;
                const figcaption = link.closest("figure")?.querySelector("figcaption");
                const text = figcaption ? figcaption.textContent.replace(/\s*Select (it|one) to enlarge( it)?\.?/i, "").trim() : "";
                caption.textContent = text;
                caption.hidden = !text;
                box.showModal();
                document.documentElement.classList.add("has-lightbox");
            });
        });

        box.querySelector(".lightbox__close").addEventListener("click", () => box.close());
        // a click on the dark backdrop (the dialog itself, not its contents) closes it
        box.addEventListener("click", (event) => {
            if (event.target === box) box.close();
        });
        box.addEventListener("close", () => {
            document.documentElement.classList.remove("has-lightbox");
            img.removeAttribute("src");
        });
    }
})();
