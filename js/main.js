/* =========================================================
   Yevheniia Abashkina – Portfolio
   Language, navigation, carousel, reveal animation
   ========================================================= */
(function () {
  "use strict";

  const root = document.documentElement;

  /* ---------- Language (DE / EN) ---------- */
  const STORAGE_KEY = "ya-lang";

  function getStoredLang() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setLang(lang) {
    root.lang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
    document.querySelectorAll(".lang-switch button").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.setLang === lang));
    });
    // Title & meta description per language
    const t = document.querySelector("meta[name='title-" + lang + "']");
    if (t) document.title = t.content;
    const d = document.querySelector("meta[name='description-" + lang + "']");
    const desc = document.querySelector("meta[name='description']");
    if (d && desc) desc.content = d.content;
  }

  const initial =
    getStoredLang() ||
    ((navigator.language || "de").toLowerCase().startsWith("de") ? "de" : "en");
  setLang(initial);

  document.querySelectorAll(".lang-switch button").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.setLang));
  });

  /* ---------- Header state on scroll ---------- */
  const progressBar = document.querySelector(".scroll-progress");
  let ticking = false;

  /* ---------- Buttons sliding along their line on scroll ---------- */
  const slideLines = Array.from(document.querySelectorAll(".btn-line"));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function updateSlideButtons() {
    if (reducedMotion) return;
    const vh = window.innerHeight;
    slideLines.forEach((line) => {
      const btn = line.querySelector(".btn");
      if (!btn) return;
      const lineEnd = line.clientWidth / 2;               // the line stops at 50 % of the row
      const isRight = line.classList.contains("btn-line--right");
      // Distance between the button's inner edge and the end of the line
      const distance = isRight
        ? btn.offsetLeft - lineEnd
        : lineEnd - (btn.offsetLeft + btn.offsetWidth);
      if (distance <= 0) { btn.style.removeProperty("--shift"); return; }
      // Progress: 0 when the row enters at the bottom, 1 when it reaches 30 % from the top
      const top = line.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, (vh - top) / (vh * 0.7)));
      btn.style.setProperty("--shift", (isRight ? -1 : 1) * distance * p + "px");
    });
  }

  function onScroll() {
    updateSlideButtons();
    const y = window.scrollY;
    root.classList.toggle("is-scrolled", y > 260);
    root.classList.toggle("has-shadow", y > 10);
    root.classList.toggle("show-to-top", y > 700);
    if (progressBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.setProperty("--progress", max > 0 ? (y / max).toFixed(4) : 0);
    }
    ticking = false;
  }
  onScroll();
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  window.addEventListener("resize", updateSlideButtons);

  /* ---------- Back to top ---------- */
  const toTop = document.querySelector(".to-top");
  if (toTop) toTop.addEventListener("click", () => window.scrollTo({ top: 0 }));

  /* ---------- Mobile navigation ---------- */
  const toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const open = root.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll(".main-nav a").forEach((a) =>
      a.addEventListener("click", () => {
        root.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  // Dropdown on click (touch devices)
  document.querySelectorAll(".has-sub > .nav-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const li = btn.parentElement;
      const open = li.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
  });
  document.addEventListener("click", (e) => {
    document.querySelectorAll(".has-sub.open").forEach((li) => {
      if (!li.contains(e.target)) {
        li.classList.remove("open");
        li.querySelector(".nav-link").setAttribute("aria-expanded", "false");
      }
    });
  });

  /* ---------- Coverflow carousel ---------- */
  document.querySelectorAll("[data-coverflow]").forEach(initCoverflow);

  function initCoverflow(el) {
    const stage = el.querySelector(".coverflow-stage");
    const slides = Array.from(el.querySelectorAll(".coverflow-slide"));
    const dotsWrap = el.querySelector(".coverflow-dots");
    const n = slides.length;
    if (!n) return;

    let active = 0;
    let timer = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dots = slides.map((slide, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Slide " + (i + 1));
      b.addEventListener("click", () => { go(i); restart(); });
      dotsWrap.appendChild(b);
      return b;
    });

    function layout() {
      const narrow = window.innerWidth < 700;
      const step = narrow ? 30 : 34;   // horizontal offset in % of slide width
      slides.forEach((slide, i) => {
        let off = i - active;
        if (off > n / 2) off -= n;
        if (off < -n / 2) off += n;
        const abs = Math.abs(off);
        const visible = abs <= (narrow ? 1 : 3);
        const scale = 1 - Math.min(abs, 4) * 0.17;
        const x = off === 0 ? 0 : Math.sign(off) * (50 + step * (abs - 1) + 22);
        slide.style.transform =
          "translate(-50%, -50%) translateX(" + x + "%) scale(" + scale + ")";
        slide.style.zIndex = String(50 - abs);
        slide.style.opacity = visible ? String(1 - abs * 0.12) : "0";
        slide.style.pointerEvents = visible ? "auto" : "none";
        slide.style.filter = off === 0 ? "none" : "brightness(" + (1 - abs * 0.12) + ")";
        slide.classList.toggle("is-active", off === 0);
        slide.setAttribute("aria-hidden", String(off !== 0));
      });
      dots.forEach((d, i) => d.setAttribute("aria-current", String(i === active)));
    }

    function go(i) {
      active = (i + n) % n;
      layout();
    }

    function restart() {
      if (reduced) return;
      clearInterval(timer);
      timer = setInterval(() => go(active + 1), 5000);
    }

    slides.forEach((slide, i) => {
      slide.addEventListener("click", () => {
        if (i !== active) { go(i); restart(); return; }
        // Slides without a project card link straight to the client website
        if (slide.dataset.href) {
          window.open(slide.dataset.href, "_blank", "noopener");
          return;
        }
        const target = slide.dataset.target && document.getElementById(slide.dataset.target);
        if (target) target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      });
    });

    const prev = el.querySelector(".coverflow-nav--prev");
    const next = el.querySelector(".coverflow-nav--next");
    if (prev) prev.addEventListener("click", () => { go(active - 1); restart(); });
    if (next) next.addEventListener("click", () => { go(active + 1); restart(); });

    el.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { go(active - 1); restart(); }
      if (e.key === "ArrowRight") { go(active + 1); restart(); }
    });

    // Swipe
    let startX = null;
    stage.addEventListener("pointerdown", (e) => { startX = e.clientX; });
    stage.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 40) { go(active + (dx < 0 ? 1 : -1)); restart(); }
      startX = null;
    });

    el.addEventListener("mouseenter", () => clearInterval(timer));
    el.addEventListener("mouseleave", restart);
    window.addEventListener("resize", layout);

    layout();
    restart();
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll(".reveal, .reveal-stagger, .role-media");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach((r) => io.observe(r));
  } else {
    reveals.forEach((r) => r.classList.add("is-visible"));
  }

  /* ---------- Soft cursor shadow (mouse devices only) ---------- */
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const calmMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (finePointer && !calmMotion) {
    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    glow.setAttribute("aria-hidden", "true");
    document.body.append(glow);

    let mx = -500, my = -500;   // mouse position
    let gx = -500, gy = -500;   // glow position (eased)

    document.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      glow.classList.add("is-active");
      glow.classList.toggle("is-light", !!e.target.closest(".contact, .home .site-footer"));
    }, { passive: true });

    document.documentElement.addEventListener("mouseleave", () => glow.classList.remove("is-active"));

    (function follow() {
      gx += (mx - gx) * 0.12;
      gy += (my - gy) * 0.12;
      glow.style.transform = `translate(${gx}px, ${gy}px)`;
      requestAnimationFrame(follow);
    })();
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();
