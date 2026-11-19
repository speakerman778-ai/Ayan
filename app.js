(() => {
  // ---------- Хранилище ----------
  const LS = {
    user: "moe-kino:user-titles", // свои тайтлы
    state: "moe-kino:state",      // id -> { status, fav }
    saved: "moe-kino:saved",      // id -> снимок тайтла из TMDB (чтобы списки работали без запросов)
    key: "moe-kino:tmdb-key",
  };
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  let state = load(LS.state, {});
  let userTitles = load(LS.user, []);
  let saved = load(LS.saved, {});
  let tmdbKey = load(LS.key, "");

  const ui = { tab: "all", q: "", genre: "", sort: "popularity" };
  const view = { items: [], page: 0, totalPages: 0, total: 0, req: 0 };
  const LIST_TABS = ["want", "watching", "watched", "fav"];
  const STATUS = {
    want: { label: "Хочу посмотреть", icon: "🔖" },
    watching: { label: "Смотрю", icon: "▶️" },
    watched: { label: "Просмотрено", icon: "✅" },
  };

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const typeLabel = (t) => (t.type === "series" ? "Сериал" : "Фильм");
  const st = (id) => state[id] || {};
  // На страницах, где сторонние запросы запрещены, TMDB отключается флагом window.NO_TMDB
  const TMDB_ALLOWED = !window.NO_TMDB;
  const useTmdb = () => TMDB_ALLOWED && !!tmdbKey;
  const localAll = () => [...window.CATALOG, ...userTitles];

  function gradient(str) {
    let h = 0;
    for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const a = h % 360, b = (a + 40 + (h >> 8) % 80) % 360;
    return `linear-gradient(160deg, hsl(${a} 55% 38%), hsl(${b} 60% 18%))`;
  }

  // ---------- TMDB ----------
  const IMG = "https://image.tmdb.org/t/p/";
  const genreMap = { movie: {}, tv: {} }; // id -> название
  let genresLoaded = false;

  async function tmdb(path, params = {}, key = tmdbKey) {
    const url = new URL("https://api.themoviedb.org/3" + path);
    url.searchParams.set("language", "ru-RU");
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") url.searchParams.set(k, v);
    const headers = { accept: "application/json" };
    // Длинный токен (v4) — в заголовке, короткий ключ (v3) — параметром
    if (key.length > 40) headers.Authorization = "Bearer " + key;
    else url.searchParams.set("api_key", key);
    let r;
    try { r = await fetch(url, { headers }); }
    catch { throw new Error("Нет связи с TMDB. Проверьте интернет (в некоторых странах сайт открывается только через VPN)."); }
    if (r.status === 401) throw new Error("TMDB не принял ключ. Проверьте его в настройках ⚙.");
    if (!r.ok) throw new Error("Ошибка TMDB: " + r.status);
    return r.json();
  }

  async function loadGenres() {
    if (genresLoaded) return;
    const [m, t] = await Promise.all([tmdb("/genre/movie/list"), tmdb("/genre/tv/list")]);
    for (const g of m.genres) genreMap.movie[g.id] = cap(g.name);
    for (const g of t.genres) genreMap.tv[g.id] = cap(g.name);
    genresLoaded = true;
  }
  const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
  const genreId = (t, name) => Object.keys(genreMap[t]).find((id) => genreMap[t][id] === name);

  function normalize(r, t) {
    t = r.media_type || t;
    const date = r.release_date || r.first_air_date || "";
    return {
      id: `tmdb-${t}-${r.id}`,
      tmdbId: r.id,
      tmdbType: t,
      type: t === "tv" ? "series" : "movie",
      title: r.title || r.name || r.original_title || r.original_name,
      original: r.original_title || r.original_name || "",
      year: date ? Number(date.slice(0, 4)) : null,
      rating: r.vote_average ? Math.round(r.vote_average * 10) / 10 : null,
      votes: r.vote_count || 0,
      popularity: r.popularity || 0,
      genres: (r.genre_ids || (r.genres || []).map((g) => g.id)).map((id) => genreMap[t]?.[id]).filter(Boolean),
      desc: r.overview || "",
      poster: r.poster_path ? IMG + "w342" + r.poster_path : null,
    };
  }

  const SORTS = {
    popularity: { movie: "popularity.desc", tv: "popularity.desc", min: 0 },
    rating: { movie: "vote_average.desc", tv: "vote_average.desc", min: { movie: 1000, tv: 300 } },
    year: { movie: "primary_release_date.desc", tv: "first_air_date.desc", min: 30 },
    yearAsc: { movie: "primary_release_date.asc", tv: "first_air_date.asc", min: 100 },
    title: { movie: "title.asc", tv: "name.asc", min: 200 },
  };

  async function fetchTmdbPage(page) {
    await loadGenres();
    const types = ui.tab === "movie" ? ["movie"] : ui.tab === "series" ? ["tv"] : ["movie", "tv"];
    const q = ui.q.trim();
    let calls;

    if (q) {
      calls = types.length === 2
        ? [tmdb("/search/multi", { query: q, page }).then((d) => ({ ...d, results: d.results.filter((r) => r.media_type === "movie" || r.media_type === "tv") }))]
        : [tmdb(`/search/${types[0]}`, { query: q, page }).then((d) => ({ ...d, results: d.results.map((r) => ({ ...r, media_type: types[0] })) }))];
    } else if (!ui.genre && ui.sort === "popularity") {
      const path = types.length === 2 ? "/trending/all/week" : `/trending/${types[0]}/week`;
      calls = [tmdb(path, { page }).then((d) => ({ ...d, results: d.results.filter((r) => r.media_type === "movie" || r.media_type === "tv").map((r) => ({ ...r, media_type: r.media_type || types[0] })) }))];
    } else {
      const today = new Date().toISOString().slice(0, 10);
      calls = types.map((t) => {
        let gid;
        if (ui.genre) { gid = genreId(t, ui.genre); if (!gid) return null; } // у этого типа нет такого жанра
        const s = SORTS[ui.sort];
        const min = typeof s.min === "object" ? s.min[t] : s.min;
        const dateKey = t === "movie" ? "primary_release_date.lte" : "first_air_date.lte";
        return tmdb(`/discover/${t}`, { page, sort_by: s[t], with_genres: gid, "vote_count.gte": min || undefined, [dateKey]: today })
          .then((d) => ({ ...d, results: d.results.map((r) => ({ ...r, media_type: t })) }));
      }).filter(Boolean);
    }

    const res = await Promise.all(calls);
    let items = res.flatMap((d) => d.results.map((r) => normalize(r)));
    if (q && ui.genre) items = items.filter((t) => t.genres.includes(ui.genre));
    if (calls.length > 1 || q) items = sortItems(items, ui.sort); // смешанную выдачу сортируем сами
    return {
      items,
      totalPages: Math.min(500, Math.max(0, ...res.map((d) => d.total_pages || 0))),
      total: res.reduce((n, d) => n + (d.total_results || 0), 0),
    };
  }

  function sortItems(list, sort) {
    const by = {
      popularity: (a, b) => (b.popularity || 0) - (a.popularity || 0),
      rating: (a, b) => (b.rating || 0) - (a.rating || 0),
      year: (a, b) => (b.year || 0) - (a.year || 0),
      yearAsc: (a, b) => (a.year || 9999) - (b.year || 9999),
      title: (a, b) => a.title.localeCompare(b.title, "ru"),
    };
    if (sort === "popularity" && !list.some((t) => t.popularity)) return list; // локальный каталог: оставляем как есть, ниже отсортирован по рейтингу
    return [...list].sort(by[sort]);
  }

  // ---------- Локальная выдача ----------
  function localFiltered(source) {
    const q = ui.q.trim().toLowerCase();
    const list = source.filter((t) => {
      const s = st(t.id);
      if (ui.tab === "movie" || ui.tab === "series") { if (t.type !== ui.tab) return false; }
      else if (ui.tab === "fav") { if (!s.fav) return false; }
      else if (STATUS[ui.tab]) { if (s.status !== ui.tab) return false; }
      if (ui.genre && !(t.genres || []).includes(ui.genre)) return false;
      if (q && !`${t.title} ${t.original || ""} ${t.year || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return ui.sort === "popularity" ? sortItems(list, "rating") : sortItems(list, ui.sort);
  }
  // Всё, что пользователь когда-либо отметил или добавил
  const knownAll = () => [...localAll(), ...Object.values(saved)];
  const findItem = (id) => view.items.find((x) => x.id === id) || knownAll().find((x) => x.id === id);

  // ---------- Отрисовка ----------
  function cardHtml(t) {
    const s = st(t.id);
    const icons = (s.fav ? "❤️" : "") + (s.status ? STATUS[s.status].icon : "");
    return `
      <article class="card" data-id="${esc(t.id)}">
        <div class="poster" style="background:${gradient(t.title)}">
          ${t.poster ? `<img src="${esc(t.poster)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
          <span class="badge">${typeLabel(t)}</span>
          ${t.rating ? `<span class="rating">★ ${Number(t.rating).toFixed(1)}</span>` : ""}
          ${t.poster ? "" : esc(t.title)}
          ${icons ? `<span class="status">${icons}</span>` : ""}
        </div>
        <div class="meta">
          <div class="t">${esc(t.title)}</div>
          <div class="s">${t.year || ""}${t.genres?.length ? " · " + esc(t.genres[0]) : ""}</div>
        </div>
      </article>`;
  }

  function paint() {
    $("#grid").innerHTML = view.items.map(cardHtml).join("");
    $("#empty").hidden = view.items.length > 0 || !$("#loading").hidden;
    $("#moreBtn").hidden = !(view.page && view.page < view.totalPages);
    $("#count").textContent = view.total > view.items.length
      ? `Показано ${view.items.length} из ${view.total.toLocaleString("ru")}`
      : `Найдено: ${view.items.length}`;
  }

  function banner(html, err) {
    const b = $("#banner");
    b.hidden = !html;
    b.className = "banner" + (err ? " err" : "");
    b.innerHTML = html || "";
  }
  function defaultBanner() {
    if (useTmdb() || !TMDB_ALLOWED) banner("");
    else banner(`<span>Сейчас показан встроенный каталог (${localAll().length}). Подключите TMDB, чтобы искать по всей базе фильмов и сериалов с постерами.</span><button class="btn primary" data-open-settings>Подключить</button>`);
  }

  async function refresh() {
    const req = ++view.req;
    defaultBanner();
    fillGenres();
    if (LIST_TABS.includes(ui.tab) || !useTmdb()) {
      const src = LIST_TABS.includes(ui.tab) ? knownAll() : localAll();
      Object.assign(view, { items: localFiltered(src), page: 0, totalPages: 0, total: 0 });
      $("#loading").hidden = true;
      return paint();
    }
    Object.assign(view, { items: [], page: 0, totalPages: 0, total: 0 });
    $("#loading").hidden = false;
    paint();
    try {
      const r = await fetchTmdbPage(1);
      if (req !== view.req) return; // пришёл устаревший ответ
      Object.assign(view, { items: r.items, page: 1, totalPages: r.totalPages, total: r.total });
      fillGenres();
    } catch (e) {
      if (req !== view.req) return;
      banner(`<span>${esc(e.message)} Показан встроенный каталог.</span><button class="btn" data-open-settings>Настройки</button>`, true);
      Object.assign(view, { items: localFiltered(localAll()), page: 0, totalPages: 0, total: 0 });
    }
    $("#loading").hidden = true;
    paint();
  }

  async function loadMore() {
    const req = view.req;
    const btn = $("#moreBtn");
    btn.disabled = true; btn.textContent = "Загрузка…";
    try {
      const r = await fetchTmdbPage(view.page + 1);
      if (req !== view.req) return;
      const seen = new Set(view.items.map((t) => t.id));
      view.items.push(...r.items.filter((t) => !seen.has(t.id)));
      view.page++;
    } catch (e) {
      banner(`<span>${esc(e.message)}</span>`, true);
    } finally {
      btn.disabled = false; btn.textContent = "Показать ещё";
      paint();
    }
  }

  function fillGenres() {
    let genres;
    if (useTmdb() && genresLoaded && !LIST_TABS.includes(ui.tab)) {
      const pick = ui.tab === "movie" ? [genreMap.movie] : ui.tab === "series" ? [genreMap.tv] : [genreMap.movie, genreMap.tv];
      genres = [...new Set(pick.flatMap((m) => Object.values(m)))];
    } else {
      genres = [...new Set((LIST_TABS.includes(ui.tab) ? knownAll() : localAll()).flatMap((t) => t.genres || []))];
    }
    genres.sort((a, b) => a.localeCompare(b, "ru"));
    const sel = $("#genre");
    sel.innerHTML = `<option value="">Все жанры</option>` + genres.map((g) => `<option>${esc(g)}</option>`).join("");
    if (!genres.includes(ui.genre)) ui.genre = "";
    sel.value = ui.genre;
  }

  // ---------- Состояние пользователя ----------
  function setState(item, patch) {
    const id = item.id;
    state[id] = { ...st(id), ...patch };
    const s = state[id];
    if (!s.status && !s.fav) delete state[id];
    if (id.startsWith("tmdb-")) {
      if (state[id]) saved[id] = { ...item, details: undefined };
      else delete saved[id];
      save(LS.saved, saved);
    }
    save(LS.state, state);
    // перерисовываем карточку без новых запросов
    if (LIST_TABS.includes(ui.tab)) view.items = localFiltered(knownAll());
    paint();
  }

  // ---------- Карточка тайтла ----------
  async function openDetails(id) {
    const t = findItem(id);
    if (!t) return;
    const d = $("#details");
    d.dataset.id = id;
    renderDetails(t);
    if (!d.open) d.showModal();
    if (t.tmdbId && !t.details && useTmdb()) {
      try {
        const x = await tmdb(`/${t.tmdbType}/${t.tmdbId}`, {
          append_to_response: "videos,credits,watch/providers",
          include_video_language: "ru,en,null",
        });
        await loadGenres();
        Object.assign(t, normalize({ ...x, genre_ids: undefined }, t.tmdbType), {
          details: {
            backdrop: x.backdrop_path ? IMG + "w780" + x.backdrop_path : null,
            runtime: x.runtime || (x.episode_run_time || [])[0] || null,
            seasons: x.number_of_seasons || null,
            episodes: x.number_of_episodes || null,
            tagline: x.tagline || "",
            cast: (x.credits?.cast || []).slice(0, 8).map((c) => c.name),
            trailer: pickTrailer(x.videos?.results || []),
            providers: x["watch/providers"]?.results?.RU || null,
          },
        });
        if (d.open && d.dataset.id === id) renderDetails(t);
      } catch { /* остаёмся с тем, что есть */ }
    }
  }

  function pickTrailer(videos) {
    const yt = videos.filter((v) => v.site === "YouTube");
    const v = yt.find((v) => v.type === "Trailer" && v.iso_639_1 === "ru") || yt.find((v) => v.type === "Trailer") || yt[0];
    return v ? "https://www.youtube.com/watch?v=" + v.key : null;
  }

  function providersHtml(p) {
    if (!p) return "";
    const groups = [["flatrate", "По подписке"], ["free", "Бесплатно"], ["ads", "С рекламой"], ["rent", "Аренда"], ["buy", "Покупка"]];
    const seen = new Set();
    const rows = groups.map(([k, label]) => {
      const list = (p[k] || []).filter((x) => !seen.has(x.provider_id + k));
      if (!list.length) return "";
      return `<p class="sub">${label}</p><div class="providers">${list.map((x) =>
        `<a href="${esc(p.link)}" target="_blank" rel="noopener">${x.logo_path ? `<img src="${IMG}w92${esc(x.logo_path)}" alt="">` : ""}${esc(x.provider_name)}</a>`).join("")}</div>`;
    }).join("");
    return rows;
  }

  function renderDetails(t) {
    const s = st(t.id);
    const det = t.details || {};
    const qRu = encodeURIComponent(`${t.title} ${t.year || ""}`.trim());
    const q = encodeURIComponent(`${t.original || t.title} ${t.year || ""}`.trim());
    const facts = [
      t.original && t.original !== t.title ? esc(t.original) : "",
      typeLabel(t),
      t.year || "—",
      det.seasons || t.seasons ? `${det.seasons || t.seasons} сез.${det.episodes ? ` / ${det.episodes} сер.` : ""}` : "",
      det.runtime ? `${det.runtime} мин` : "",
      t.rating ? `<span style="color:var(--gold)">★ ${Number(t.rating).toFixed(1)}</span>` : "",
    ].filter(Boolean).join(" · ");
    const head = det.backdrop
      ? `<div class="d-head img" style="background-image:url('${esc(det.backdrop)}')"><span>${esc(t.title)}</span></div>`
      : `<div class="d-head" style="background:${gradient(t.title)}">${esc(t.title)}</div>`;
    const imdbOrTmdb = t.tmdbId
      ? `<a class="btn" target="_blank" rel="noopener" href="https://www.themoviedb.org/${t.tmdbType}/${t.tmdbId}?language=ru">TMDB</a>`
      : `<a class="btn" target="_blank" rel="noopener" href="https://www.imdb.com/find/?q=${q}">IMDb</a>`;

    $("#details").innerHTML = `
      <div style="position:relative">
        <button class="close" data-act="close" aria-label="Закрыть">×</button>
        ${head}
      </div>
      <div class="d-body">
        <p class="muted">${facts}</p>
        <div class="chips">${(t.genres || []).map((g) => `<span class="chip">${esc(g)}</span>`).join("")}</div>
        ${det.tagline ? `<p><i>«${esc(det.tagline)}»</i></p>` : ""}
        ${t.desc ? `<p>${esc(t.desc)}</p>` : ""}
        ${det.cast?.length ? `<p class="cast">В ролях: ${det.cast.map(esc).join(", ")}</p>` : ""}
        ${providersHtml(det.providers)}
        <div class="btn-row">
          ${Object.entries(STATUS).map(([k, v]) => `<button class="btn ${s.status === k ? "on" : ""}" data-act="status" data-v="${k}">${v.icon} ${v.label}</button>`).join("")}
          <button class="btn ${s.fav ? "on" : ""}" data-act="fav">${s.fav ? "❤️ В любимом" : "🤍 В любимое"}</button>
        </div>
        <div class="btn-row links">
          <a class="btn" target="_blank" rel="noopener" href="https://www.justwatch.com/ru/search?q=${qRu}">📺 Где смотреть</a>
          <a class="btn" target="_blank" rel="noopener" href="${esc(det.trailer || `https://www.youtube.com/results?search_query=${qRu}+трейлер`)}">▶ Трейлер</a>
          <a class="btn" target="_blank" rel="noopener" href="https://www.kinopoisk.ru/index.php?kp_query=${qRu}">Кинопоиск</a>
          ${imdbOrTmdb}
          ${t.id.startsWith("u") ? `<button class="btn" data-act="delete">🗑 Удалить</button>` : ""}
          ${t.id.startsWith("u") ? `<button class="btn primary" data-act="delete-yes" hidden>Точно удалить</button>` : ""}
        </div>
      </div>`;
  }

  // ---------- События ----------
  $("#grid").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) openDetails(card.dataset.id);
  });

  $("#details").addEventListener("click", (e) => {
    const d = $("#details");
    if (e.target === d) return d.close();
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const t = findItem(d.dataset.id);
    const act = btn.dataset.act;
    if (act === "close" || !t) return d.close();
    if (act === "status") setState(t, { status: st(t.id).status === btn.dataset.v ? null : btn.dataset.v });
    if (act === "fav") setState(t, { fav: !st(t.id).fav });
    if (act === "delete") { // подтверждение второй кнопкой: confirm() работает не везде
      btn.hidden = true;
      d.querySelector('[data-act="delete-yes"]').hidden = false;
      return;
    }
    if (act === "delete-yes") {
      userTitles = userTitles.filter((x) => x.id !== t.id);
      delete state[t.id];
      save(LS.user, userTitles); save(LS.state, state);
      d.close();
      return refresh();
    }
    renderDetails(t);
  });

  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
    ui.tab = b.dataset.tab;
    refresh();
  });

  let searchTimer;
  $("#search").addEventListener("input", (e) => {
    ui.q = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(refresh, useTmdb() ? 350 : 0);
  });
  $("#genre").addEventListener("change", (e) => { ui.genre = e.target.value; refresh(); });
  $("#sort").addEventListener("change", (e) => { ui.sort = e.target.value; refresh(); });
  $("#moreBtn").addEventListener("click", loadMore);

  $("#randomBtn").addEventListener("click", () => {
    let pool = view.items.filter((t) => st(t.id).status !== "watched");
    if (!pool.length) pool = view.items;
    if (pool.length) openDetails(pool[Math.floor(Math.random() * pool.length)].id);
  });

  // Добавление своего тайтла
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
      genres: f.get("genres").split(",").map((g) => g.trim()).filter(Boolean).map((g) => cap(g.toLowerCase())),
      desc: f.get("desc").trim(),
    });
    save(LS.user, userTitles);
    refresh();
  });

  // Настройки TMDB
  const settings = $("#settings");
  const msg = (text) => { const m = $("#settingsMsg"); m.hidden = !text; m.textContent = text || ""; };
  function openSettings() {
    $("#settingsForm").key.value = tmdbKey;
    msg("");
    settings.showModal();
  }
  $("#settingsBtn").addEventListener("click", openSettings);
  $("#banner").addEventListener("click", (e) => { if (e.target.closest("[data-open-settings]")) openSettings(); });
  $("#settingsCancel").addEventListener("click", () => settings.close());
  $("#keyRemove").addEventListener("click", () => {
    tmdbKey = ""; save(LS.key, ""); genresLoaded = false;
    settings.close(); refresh();
  });
  $("#settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const key = e.target.key.value.trim();
    if (!key) return msg("Вставьте ключ.");
    msg("Проверяю ключ…");
    try {
      await tmdb("/genre/movie/list", {}, key);
      tmdbKey = key; save(LS.key, key); genresLoaded = false;
      settings.close();
      refresh();
    } catch (err) {
      msg(err.message);
    }
  });

  if (!TMDB_ALLOWED) $("#settingsBtn").hidden = true;
  refresh();
})();
