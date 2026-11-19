(() => {
  const LS_USER = "moe-kino:user-titles";
  const LS_STATE = "moe-kino:state";

  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  // state[id] = { status: "want"|"watching"|"watched"|null, fav: bool }
  let state = load(LS_STATE, {});
  let userTitles = load(LS_USER, []);
  const all = () => [...window.CATALOG, ...userTitles];

  const ui = { tab: "all", q: "", genre: "", sort: "rating" };
  const $ = (s) => document.querySelector(s);

  const STATUS = {
    want: { label: "Хочу посмотреть", icon: "🔖" },
    watching: { label: "Смотрю", icon: "▶️" },
    watched: { label: "Просмотрено", icon: "✅" },
  };

  // Цвет «постера» стабильно вычисляется из названия
  function gradient(str) {
    let h = 0;
    for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const a = h % 360, b = (a + 40 + (h >> 8) % 80) % 360;
    return `linear-gradient(160deg, hsl(${a} 55% 38%), hsl(${b} 60% 18%))`;
  }

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const typeLabel = (t) => (t.type === "series" ? "Сериал" : "Фильм");
  const st = (id) => state[id] || {};

  function setState(id, patch) {
    state[id] = { ...st(id), ...patch };
    save(LS_STATE, state);
    render();
  }

  function filtered() {
    const q = ui.q.trim().toLowerCase();
    let list = all().filter((t) => {
      const s = st(t.id);
      if (ui.tab === "movie" || ui.tab === "series") { if (t.type !== ui.tab) return false; }
      else if (ui.tab === "fav") { if (!s.fav) return false; }
      else if (STATUS[ui.tab]) { if (s.status !== ui.tab) return false; }
      if (ui.genre && !(t.genres || []).includes(ui.genre)) return false;
      if (q && !`${t.title} ${t.original || ""} ${t.year || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const by = {
      rating: (a, b) => (b.rating || 0) - (a.rating || 0),
      year: (a, b) => (b.year || 0) - (a.year || 0),
      yearAsc: (a, b) => (a.year || 0) - (b.year || 0),
      title: (a, b) => a.title.localeCompare(b.title, "ru"),
    };
    return list.sort(by[ui.sort]);
  }

  function render() {
    const list = filtered();
    $("#grid").innerHTML = list.map((t) => {
      const s = st(t.id);
      const icons = (s.fav ? "❤️" : "") + (s.status ? STATUS[s.status].icon : "");
      return `
        <article class="card" data-id="${esc(t.id)}">
          <div class="poster" style="background:${gradient(t.title)}">
            <span class="badge">${typeLabel(t)}</span>
            ${t.rating ? `<span class="rating">★ ${Number(t.rating).toFixed(1)}</span>` : ""}
            ${esc(t.title)}
            ${icons ? `<span class="status">${icons}</span>` : ""}
          </div>
          <div class="meta">
            <div class="t">${esc(t.title)}</div>
            <div class="s">${t.year || ""}${t.genres?.length ? " · " + esc(t.genres[0]) : ""}</div>
          </div>
        </article>`;
    }).join("");
    $("#empty").hidden = list.length > 0;
    $("#count").textContent = `Найдено: ${list.length}`;
  }

  function fillGenres() {
    const genres = [...new Set(all().flatMap((t) => t.genres || []))].sort((a, b) => a.localeCompare(b, "ru"));
    const sel = $("#genre");
    const cur = sel.value;
    sel.innerHTML = `<option value="">Все жанры</option>` + genres.map((g) => `<option>${esc(g)}</option>`).join("");
    sel.value = genres.includes(cur) ? cur : "";
  }

  function openDetails(id) {
    const t = all().find((x) => x.id === id);
    if (!t) return;
    const s = st(id);
    const q = encodeURIComponent(`${t.original || t.title} ${t.year || ""}`.trim());
    const qRu = encodeURIComponent(`${t.title} ${t.year || ""}`.trim());
    const isUser = id.startsWith("u");
    const d = $("#details");
    d.innerHTML = `
      <div style="position:relative">
        <button class="close" data-act="close" aria-label="Закрыть">×</button>
        <div class="d-head" style="background:${gradient(t.title)}">${esc(t.title)}</div>
      </div>
      <div class="d-body">
        <p class="muted">${esc(t.original && t.original !== t.title ? t.original + " · " : "")}${typeLabel(t)} · ${t.year || "—"}${t.seasons ? ` · ${t.seasons} сез.` : ""}${t.rating ? ` · <span style="color:var(--gold)">★ ${Number(t.rating).toFixed(1)}</span>` : ""}</p>
        <div class="chips">${(t.genres || []).map((g) => `<span class="chip">${esc(g)}</span>`).join("")}</div>
        ${t.desc ? `<p>${esc(t.desc)}</p>` : ""}
        <div class="btn-row">
          ${Object.entries(STATUS).map(([k, v]) => `<button class="btn ${s.status === k ? "on" : ""}" data-act="status" data-v="${k}">${v.icon} ${v.label}</button>`).join("")}
          <button class="btn ${s.fav ? "on" : ""}" data-act="fav">${s.fav ? "❤️ В любимом" : "🤍 В любимое"}</button>
        </div>
        <div class="btn-row links">
          <a class="btn" target="_blank" rel="noopener" href="https://www.justwatch.com/ru/search?q=${qRu}">📺 Где смотреть</a>
          <a class="btn" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${qRu}+трейлер">▶ Трейлер</a>
          <a class="btn" target="_blank" rel="noopener" href="https://www.kinopoisk.ru/index.php?kp_query=${qRu}">Кинопоиск</a>
          <a class="btn" target="_blank" rel="noopener" href="https://www.imdb.com/find/?q=${q}">IMDb</a>
          ${isUser ? `<button class="btn" data-act="delete">🗑 Удалить</button>` : ""}
        </div>
      </div>`;
    d.dataset.id = id;
    if (!d.open) d.showModal();
  }

  // ---- События ----
  $("#grid").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) openDetails(card.dataset.id);
  });

  $("#details").addEventListener("click", (e) => {
    const d = $("#details");
    if (e.target === d) return d.close(); // клик по фону
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = d.dataset.id;
    const act = btn.dataset.act;
    if (act === "close") return d.close();
    if (act === "status") setState(id, { status: st(id).status === btn.dataset.v ? null : btn.dataset.v });
    if (act === "fav") setState(id, { fav: !st(id).fav });
    if (act === "delete") {
      if (!confirm("Удалить этот тайтл?")) return;
      userTitles = userTitles.filter((t) => t.id !== id);
      delete state[id];
      save(LS_USER, userTitles); save(LS_STATE, state);
      fillGenres(); render(); return d.close();
    }
    openDetails(id);
  });

  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
    ui.tab = b.dataset.tab;
    render();
  });

  $("#search").addEventListener("input", (e) => { ui.q = e.target.value; render(); });
  $("#genre").addEventListener("change", (e) => { ui.genre = e.target.value; render(); });
  $("#sort").addEventListener("change", (e) => { ui.sort = e.target.value; render(); });

  $("#randomBtn").addEventListener("click", () => {
    let pool = filtered().filter((t) => st(t.id).status !== "watched");
    if (!pool.length) pool = filtered();
    if (!pool.length) return;
    openDetails(pool[Math.floor(Math.random() * pool.length)].id);
  });

  const addDialog = $("#addDialog");
  $("#addBtn").addEventListener("click", () => { $("#addForm").reset(); addDialog.showModal(); });
  $("#addCancel").addEventListener("click", () => addDialog.close());
  $("#addForm").addEventListener("submit", (e) => {
    const f = new FormData(e.target);
    const title = f.get("title").trim();
    if (!title) return;
    userTitles.push({
      id: "u" + Date.now(),
      type: f.get("type"),
      title,
      original: f.get("original").trim(),
      year: Number(f.get("year")) || null,
      rating: Number(f.get("rating")) || null,
      genres: f.get("genres").split(",").map((g) => g.trim()).filter(Boolean)
        .map((g) => g[0].toUpperCase() + g.slice(1).toLowerCase()),
      desc: f.get("desc").trim(),
    });
    save(LS_USER, userTitles);
    fillGenres(); render();
  });

  fillGenres();
  render();
})();
