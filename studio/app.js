(function () {
  var C = window.STUDIO || {};
  document.getElementById("year").textContent = new Date().getFullYear();

  // ---- Галерея стилей ----
  var works = [
    { img: "savely-outside", t: "Смотритель", s: "Плоский мультфильм", f: "warm" },
    { img: "savely-inside", t: "Знакомство с героями", s: "Плашки с именами", f: "warm" },
    { img: "paper", t: "Аппликация", s: "Вырезано из бумаги", f: "warm" },
    { img: "toy", t: "Игрушечный 3D", s: "Мягкий пластилин", f: "warm" },
    { img: "lowpoly", t: "Low-poly", s: "Гранёный 3D", f: "warm" },
    { img: "neon", t: "Неон", s: "Светящиеся линии", f: "bold" },
    { img: "comic", t: "Комикс", s: "Поп-арт, точки, «БАХ!»", f: "bold" },
    { img: "blueprint", t: "Чертёж", s: "Для техники и обучения", f: "bold" },
    { img: "pixel", t: "Пиксель-арт", s: "Как в старой игре", f: "retro" },
    { img: "chalk", t: "Мел на доске", s: "Объясняем сложное", f: "retro" },
    { img: "woodblock", t: "Плакат", s: "Советская графика", f: "retro" },
    { img: "newspaper", t: "Газета", s: "Архивный детектив", f: "retro" }
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

  // ---- Отправка заявки ----
  var note = document.getElementById("formNote");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.name.value.trim() || !form.contact.value.trim()) {
      note.textContent = "Укажите имя и как с вами связаться.";
      return;
    }
    var text = "Заявка с сайта\nИмя: " + form.name.value + "\nКонтакт: " + form.contact.value +
      "\nЧто нужно: " + form.plan.value + "\nО задаче: " + form.about.value;

    if (C.formEndpoint) {
      note.textContent = "Отправляем…";
      fetch(C.formEndpoint, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) })
        .then(function (r) {
          if (!r.ok) throw 0;
          form.reset();
          note.textContent = "Спасибо! Заявка у нас, ответим в течение дня.";
        })
        .catch(function () { note.textContent = "Не получилось отправить. Напишите нам напрямую, кнопки слева."; });
      return;
    }
    if (C.whatsapp) {
      window.open("https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(text), "_blank");
      note.textContent = "Открываем WhatsApp с готовым текстом заявки…";
    } else if (C.telegram) {
      try { navigator.clipboard.writeText(text); } catch (_) {}
      note.textContent = "Текст заявки скопирован. Вставьте его в открывшийся чат Telegram.";
      window.open("https://t.me/" + C.telegram, "_blank");
    } else if (C.email) {
      location.href = "mailto:" + C.email + "?subject=" + encodeURIComponent("Заявка на ролик") + "&body=" + encodeURIComponent(text);
    } else {
      note.textContent = "Контакты студии ещё не настроены (файл config.js).";
    }
  });
})();
