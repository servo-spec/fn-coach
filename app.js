// ============ НАСТРОЙКА ============
// Впиши сюда URL своего бэкенда (Render / VPS / любой хостинг)
// Например: "https://my-fn-coach.onrender.com"
const API_URL = "https://fn-coach-beckend.onrender.com/";

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const initData = tg.initData; // для авторизации на бэкенде
const userId = tg.initDataUnsafe?.user?.id;

// ============ API-ХЕЛПЕР ============
async function api(path, method = "GET", body = null) {
  const res = await fetch(API_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      // Передаём подпись Telegram — бэкенд проверит и достанет user_id
      "X-Telegram-Init-Data": initData
    },
    body: body ? JSON.stringify(body) : null
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ============ РЕНДЕР ============
const content = document.getElementById("content");
const loader = document.getElementById("loader");

function showLoader(on) {
  loader.classList.toggle("hidden", !on);
}

function renderToday(data) {
  if (!data || !data.steps) {
    content.innerHTML = `<div class="empty">Сегодня отдых 😴</div>`;
    return;
  }
  let html = `<div class="card"><h2>${data.name}</h2>`;
  data.steps.forEach((s, i) => {
    html += `<div class="step"><span>${i + 1}. ${s.text}</span><span class="time">${s.time}</span></div>`;
  });
  html += `</div>
    <button class="btn" id="finish-btn">✅ Отметить тренировку</button>`;
  content.innerHTML = html;
  document.getElementById("finish-btn").onclick = async () => {
    try {
      await api("/api/sessions", "POST", { type: data.type, duration: data.total || 60 });
      tg.showAlert("Записано ✅");
    } catch (e) {
      tg.showAlert("Ошибка: " + e.message);
    }
  };
}

function renderWeek(data) {
  let html = `<div class="card"><h2>📅 План на неделю</h2>`;
  data.forEach(d => {
    html += `<div class="step"><span>${d.day}</span><span>${d.name}</span></div>`;
  });
  html += `</div>`;
  content.innerHTML = html;
}

function renderMistakes(data) {
  let html = `<div class="card"><h2>❌ Мои ошибки</h2>`;
  if (!data.length) {
    html += `<div class="empty">Пока пусто</div>`;
  } else {
    data.forEach(m => {
      html += `<div class="mistake">
        <span>${m.text}</span>
        <button onclick="fixMistake(${m.id})">✓</button>
      </div>`;
    });
  }
  html += `</div>
    <input id="new-mistake" placeholder="Опиши ошибку...">
    <button class="btn" id="add-mistake">Добавить</button>`;
  content.innerHTML = html;
  document.getElementById("add-mistake").onclick = async () => {
    const val = document.getElementById("new-mistake").value.trim();
    if (!val) return;
    await api("/api/mistakes", "POST", { text: val });
    loadTab("mistakes");
  };
}

window.fixMistake = async (id) => {
  await api(`/api/mistakes/${id}/fix`, "PATCH");
  loadTab("mistakes");
};

function renderRanked(data) {
  content.innerHTML = `
    <div class="card">
      <h2>🏆 Готов ли ты в ранкед?</h2>
      <div class="step"><span>☑️ Разминка 10-15 мин</span></div>
      <div class="step"><span>☑️ Выбрана 1 ошибка для фокуса</span></div>
      <div class="step"><span>☑️ Не уставший и не злой</span></div>
      <div class="step"><span>☑️ План: 3 матча → перерыв</span></div>
    </div>
    <div class="card">
      <h2>💡 Совет</h2>
      <p style="font-size:14px;opacity:.8">${data.advice}</p>
    </div>`;
}

function renderStats(data) {
  let html = `<div class="card"><h2>📊 За неделю</h2>`;
  if (!data.items || !data.items.length) {
    html += `<div class="empty">Нет записей</div>`;
  } else {
    data.items.forEach(i => {
      html += `<div class="step"><span>${i.type}</span><span>${i.minutes} мин</span></div>`;
    });
    html += `<div class="step" style="font-weight:600;margin-top:8px">
      <span>Итого</span><span>${data.total} мин</span></div>`;
  }
  html += `</div>`;
  content.innerHTML = html;
}

// ============ ЗАГРУЗКА ВКЛАДОК ============
const loaders = {
  today:    () => api("/api/training/today").then(renderToday),
  week:     () => api("/api/training/week").then(renderWeek),
  mistakes: () => api("/api/mistakes").then(renderMistakes),
  ranked:   () => api("/api/ranked/advice").then(renderRanked),
  stats:    () => api("/api/stats/week").then(renderStats),
};

async function loadTab(tab) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  showLoader(true);
  try {
    await loaders[tab]();
  } catch (e) {
    content.innerHTML = `<div class="empty">Ошибка: ${e.message}</div>`;
  }
  showLoader(false);
}

document.querySelectorAll(".tab").forEach(t => {
  t.onclick = () => loadTab(t.dataset.tab);
});

// ============ СТАРТ ============
if (tg.initDataUnsafe?.user) {
  document.getElementById("user-name").textContent = tg.initDataUnsafe.user.first_name;
}
loadTab("today");
