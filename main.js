(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  // Theme
  const themeKey = "portfolio-theme";
  const saved = localStorage.getItem(themeKey);
  if (saved === "dark" || saved === "light") {
    document.documentElement.setAttribute("data-theme", saved);
  } else {
    // Default to dark for neon theme
    document.documentElement.setAttribute("data-theme", "dark");
  }

  const themeBtn = $("#theme-toggle");
  themeBtn?.addEventListener("click", () => {
    const cur =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(themeKey, next);
  });

  // Mobile nav
  const toggle = $(".menu-toggle");
  const navList = $("#nav-list");
  toggle?.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    navList?.classList.toggle("open");
  });
  $$("#nav-list a").forEach((a) =>
    a.addEventListener("click", () => {
      navList?.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
    })
  );

  // Smooth scroll
  $$('.site-nav a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href) return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    })
  );

  // Footer year
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // To top
  const toTop = $("#to-top");
  const onScroll = () => {
    if (!toTop) return;
    const show = window.scrollY > 400;
    toTop.classList.toggle("show", show);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  toTop?.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
  );
  onScroll();

  // Projects renderer
  const renderProjects = () => {
    const dataEl = document.getElementById("projects-data");
    const grid = document.getElementById("projects-grid");
    if (!dataEl || !grid) return;
    try {
      const json = JSON.parse(dataEl.textContent || "{}");
      let items = Array.isArray(json.items) ? json.items : [];
      // sort by order if provided
      items = items.slice().sort((a,b)=>{
        const ao = typeof a.order === 'number' ? a.order : 9999;
        const bo = typeof b.order === 'number' ? b.order : 9999;
        return ao - bo;
      });
      grid.innerHTML = "";
      if(items.length === 0){
        const empty = document.createElement('p');
        empty.className = 'muted';
        empty.textContent = '制作実績は準備中です。';
        grid.appendChild(empty);
        return;
      }
      items.forEach((item) => {
        const article = document.createElement("article");
        article.className = "card project-card";

        const media = document.createElement("div");
        media.className = "card-media";
        media.setAttribute("aria-hidden", "true");
        if(item.image){
          media.style.background = `linear-gradient(135deg, color-mix(in lab, var(--neon-cyan) 10%, transparent), color-mix(in lab, var(--neon-lime) 6%, var(--surface))), url('${item.image}') center/cover no-repeat`;
        }

        const body = document.createElement("div");
        body.className = "card-body";

        const h3 = document.createElement("h3");
        h3.className = "card-title";
        h3.textContent = item.title || "Untitled";

        const p = document.createElement("p");
        p.className = "card-text";
        if (item.description) p.textContent = item.description;

        // tags
        if(Array.isArray(item.tags) && item.tags.length){
          const tags = document.createElement('ul');
          tags.className = 'chip-list';
          item.tags.forEach(t=>{
            const li = document.createElement('li');
            li.className = 'chip';
            li.textContent = t;
            tags.appendChild(li);
          });
          body.appendChild(tags);
        }

        const actions = document.createElement("div");
        actions.className = "card-actions";
        (item.links || []).forEach((link) => {
          if (!link || !link.url) return;
          const a = document.createElement("a");
          a.href = link.url;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = link.label || "Link";
          const variant = link.variant === "ghost" ? " ghost" : "";
          a.className = "btn small" + variant;
          actions.appendChild(a);
        });

        body.appendChild(h3);
        if (item.description) body.appendChild(p);
        body.appendChild(actions);

        article.appendChild(media);
        article.appendChild(body);
        grid.appendChild(article);
      });
    } catch (e) {
      console.warn("Failed to render projects:", e);
    }
  };
  renderProjects();
})();
