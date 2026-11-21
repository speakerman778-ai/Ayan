(function () {
  var C = window.STUDIO || {};
  document.getElementById("year").textContent = new Date().getFullYear();

  // ---- Галерея стилей ----
  var works = [
    { img: "savely-outside", t: "Фирменный мультфильм", s: "Наш основной стиль", f: "warm" },
    { img: "savely-inside", t: "Знакомство с героями", s: "Плашки с именами", f: "warm" },
    { img: "s-watercolor", t: "Акварель", s: "Мягкие размытые краски", f: "warm" },
    { img: "s-sunset", t: "Закат", s: "Тёплый вечерний свет", f: "warm" },
    { img: "s-winter", t: "Зимняя сказка", s: "Снег и холодные тона", f: "warm" },
    { img: "s-candy", t: "Пастель", s: "Нежные конфетные цвета", f: "warm" },
    { img: "s-crayon", t: "Мелки", s: "Пастель на тёмной бумаге", f: "warm" },
    { img: "s-kids", t: "Детский рисунок", s: "Фломастеры в тетради", f: "warm" },
    { img: "s-diorama", t: "Диорама", s: "Игрушечный 3D-островок", f: "warm" },
    { img: "s-comic", t: "Комикс", s: "Поп-арт и растр", f: "bold" },
    { img: "s-neon", t: "Неон", s: "Светящиеся линии", f: "bold" },
    { img: "s-glass", t: "Витраж", s: "Цветное стекло", f: "bold" },
    { img: "s-pixel", t: "Пиксель-арт", s: "Как в старой игре", f: "bold" },
    { img: "s-lowpoly", t: "Low-poly", s: "Гранёный 3D", f: "bold" },
    { img: "s-poster", t: "Ретро-плакат", s: "Афиша 50-х", f: "retro" },
    { img: "s-film", t: "Старая плёнка", s: "Сепия и зерно", f: "retro" },
    { img: "s-lino", t: "Гравюра", s: "Линогравюра со штрихом", f: "retro" },
    { img: "s-ink", t: "Тушь", s: "Японская живопись", f: "retro" },
    { img: "s-chalk", t: "Мел на доске", s: "Объясняем сложное", f: "retro" },
    { img: "s-blueprint", t: "Чертёж", s: "Для техники и обучения", f: "retro" },
    { img: "s-shadow", t: "Театр теней", s: "Силуэты в лунном свете", f: "retro" }
  ];
  var g = document.getElementById("gallery");
  g.innerHTML = works.map(function (w) {
    return '<figure class="tile" data-f="' + w.f + '"><img loading="lazy" src="img/' + w.img +
      '.jpg" alt="' + w.t + '" width="540" height="960"/><figcaption><b>' + w.t + "</b>" + w.s + "</figcaption></figure>";
  }).join("");
  document.querySelectorAll(".chip").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".chip").forEach(function (x) { x.classList.toggle("on", x === b); });
      var f = b.dataset.f;
      g.querySelectorAll(".tile").forEach(function (t) { t.hidden = f !== "all" && t.dataset.f !== f; });
    });
  });

  // ---- Плашка «цена для первых клиентов» ----
  var left = C.firstClientsLeft;
  if (typeof left === "number") {
    if (left > 0) document.getElementById("promoLeft").textContent = left;
    else document.querySelectorAll(".promo, .hero-promo").forEach(function (el) { el.hidden = true; });
  }

  // ---- Кнопки «Выбрать» подставляют пакет в форму ----
  var form = document.getElementById("form");
  document.querySelectorAll("[data-plan]").forEach(function (a) {
    a.addEventListener("click", function () { form.plan.value = a.dataset.plan; });
  });

  // ---- Контакты ----
  var links = [];
  if (C.telegram) links.push('<a class="btn btn-ghost" href="https://t.me/' + C.telegram + '" target="_blank" rel="noopener">Telegram</a>');
  if (C.whatsapp) links.push('<a class="btn btn-ghost" href="https://wa.me/' + C.whatsapp + '" target="_blank" rel="noopener">WhatsApp</a>');
  if (C.email) links.push('<a class="btn btn-ghost" href="mailto:' + C.email + '">' + C.email + "</a>");
  document.getElementById("contacts").innerHTML = links.join("");

  // ---- Отправка заявки: кнопка-ссылка в WhatsApp с готовым текстом ----
  var note = document.getElementById("formNote");
  var send = document.getElementById("send");
  function message() {
    return "Здравствуйте! Заявка с сайта\nИмя: " + form.name.value + "\nКонтакт: " + form.contact.value +
      "\nЧто нужно: " + form.plan.value + "\nО задаче: " + form.about.value;
  }
  function update() {
    if (C.whatsapp) send.href = "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(message());
    else if (C.telegram) send.href = "https://t.me/" + C.telegram;
    else if (C.email) send.href = "mailto:" + C.email + "?subject=" + encodeURIComponent("Заявка на ролик") + "&body=" + encodeURIComponent(message());
  }
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  update();
  send.addEventListener("click", function (e) {
    if (!form.name.value.trim() || !form.contact.value.trim()) {
      e.preventDefault();
      note.textContent = "Укажите имя и как с вами связаться.";
      return;
    }
    update();
    note.textContent = "Открываем WhatsApp. Там останется нажать «Отправить».";
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); send.click(); });
})();
