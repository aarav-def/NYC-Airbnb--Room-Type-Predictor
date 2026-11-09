/* RoomSense – front end for the FastAPI /predict endpoint */

const API_BASE_URL = "https://nyc-airbnb-room-type-predictor-k5va.onrender.com"
// Order matches model.classes_ in your pipeline
const CLASSES = ["Entire home/apt", "Private room", "Shared room"];

const META = {
  "Entire home/apt": {
    label: "Entire home / apt", color: "var(--home)",
    blurb: "Guests get the whole place to themselves.",
    icon: '<svg viewBox="0 0 48 48"><path d="M6 23 24 8l18 15"/><path d="M10 20v20h28V20"/><path d="M20 40V28h8v12"/></svg>'
  },
  "Private room": {
    label: "Private room", color: "var(--room)",
    blurb: "A private room inside a home shared with others.",
    icon: '<svg viewBox="0 0 48 48"><rect x="12" y="6" width="24" height="36" rx="2"/><circle cx="30" cy="25" r="1.6"/><path d="M6 42h36"/></svg>'
  },
  "Shared room": {
    label: "Shared room", color: "var(--shared)",
    blurb: "A sleeping space shared with other guests or the host.",
    icon: '<svg viewBox="0 0 48 48"><path d="M6 40V10"/><path d="M6 18h36v22"/><path d="M6 30h36"/><circle cx="16" cy="24" r="3"/><circle cx="30" cy="24" r="3"/></svg>'
  }
};

const BOROUGHS = {
  "Bronx": {
    center: [40.8448, -73.8648],
    hoods: ["Allerton","Baychester","Belmont","Bronxdale","Castle Hill","City Island","Claremont Village","Clason Point","Co-op City","Concourse","Concourse Village","East Morrisania","Eastchester","Edenwald","Fieldston","Fordham","Highbridge","Hunts Point","Kingsbridge","Longwood","Melrose","Morris Heights","Morris Park","Morrisania","Mott Haven","Mount Eden","Mount Hope","North Riverdale","Norwood","Olinville","Parkchester","Pelham Bay","Pelham Gardens","Port Morris","Riverdale","Schuylerville","Soundview","Spuyten Duyvil","Throgs Neck","Tremont","Unionport","University Heights","Van Nest","Wakefield","West Farms","Westchester Square","Williamsbridge","Woodlawn"]
  },
  "Brooklyn": {
    center: [40.6782, -73.9442],
    hoods: ["Bath Beach","Bay Ridge","Bedford-Stuyvesant","Bensonhurst","Bergen Beach","Boerum Hill","Borough Park","Brighton Beach","Brooklyn Heights","Brownsville","Bushwick","Canarsie","Carroll Gardens","Clinton Hill","Cobble Hill","Columbia St","Coney Island","Crown Heights","Cypress Hills","DUMBO","Downtown Brooklyn","Dyker Heights","East Flatbush","East New York","Flatbush","Flatlands","Fort Greene","Fort Hamilton","Gowanus","Gravesend","Greenpoint","Kensington","Manhattan Beach","Midwood","Mill Basin","Navy Yard","Park Slope","Prospect Heights","Prospect-Lefferts Gardens","Red Hook","Sea Gate","Sheepshead Bay","South Slope","Sunset Park","Vinegar Hill","Williamsburg","Windsor Terrace"]
  },
  "Manhattan": {
    center: [40.7831, -73.9712],
    hoods: ["Battery Park City","Chelsea","Chinatown","Civic Center","East Harlem","East Village","Financial District","Flatiron District","Gramercy","Greenwich Village","Harlem","Hell's Kitchen","Inwood","Kips Bay","Little Italy","Lower East Side","Marble Hill","Midtown","Morningside Heights","Murray Hill","NoHo","Nolita","Roosevelt Island","SoHo","Stuyvesant Town","Theater District","Tribeca","Two Bridges","Upper East Side","Upper West Side","Washington Heights","West Village"]
  },
  "Queens": {
    center: [40.7282, -73.7949],
    hoods: ["Arverne","Astoria","Bay Terrace","Bayside","Bayswater","Belle Harbor","Bellerose","Breezy Point","Briarwood","Cambria Heights","College Point","Corona","Ditmars Steinway","Douglaston","East Elmhurst","Edgemere","Elmhurst","Far Rockaway","Flushing","Forest Hills","Fresh Meadows","Glendale","Hollis","Holliswood","Howard Beach","Jackson Heights","Jamaica","Jamaica Estates","Jamaica Hills","Kew Gardens","Kew Gardens Hills","Laurelton","Little Neck","Long Island City","Maspeth","Middle Village","Neponsit","Ozone Park","Queens Village","Rego Park","Richmond Hill","Ridgewood","Rockaway Beach","Rosedale","South Ozone Park","Springfield Gardens","St. Albans","Sunnyside","Whitestone","Woodhaven","Woodside"]
  },
  "Staten Island": {
    center: [40.5795, -74.1502],
    hoods: ["Arden Heights","Arrochar","Bay Terrace, Staten Island","Bull's Head","Castleton Corners","Clifton","Concord","Dongan Hills","Eltingville","Emerson Hill","Graniteville","Grant City","Great Kills","Grymes Hill","Howland Hook","Huguenot","Mariners Harbor","Midland Beach","New Brighton","New Dorp","New Dorp Beach","New Springville","Oakwood","Port Richmond","Prince's Bay","Randall Manor","Rosebank","Rossville","Shore Acres","Silver Lake","South Beach","St. George","Stapleton","Todt Hill","Tompkinsville","Tottenville","West Brighton","Westerleigh","Willowbrook"]
  }
};

const PRESETS = {
  home:   { borough: "Manhattan", hood: "Midtown", latitude: 40.7549, longitude: -73.984, price: 220, minimum_nights: 3, number_of_reviews: 45, reviews_per_month: 1.2, calculated_host_listings_count: 1, availability_365: 200 },
  room:   { borough: "Brooklyn", hood: "Bedford-Stuyvesant", latitude: 40.6872, longitude: -73.9418, price: 65, minimum_nights: 2, number_of_reviews: 30, reviews_per_month: 0.9, calculated_host_listings_count: 2, availability_365: 120 },
  shared: { borough: "Queens", hood: "Jamaica", latitude: 40.7021, longitude: -73.7897, price: 35, minimum_nights: 1, number_of_reviews: 12, reviews_per_month: 0.5, calculated_host_listings_count: 3, availability_365: 300 }
};

const NUM_FIELDS = ["latitude","longitude","price","minimum_nights","number_of_reviews","reviews_per_month","calculated_host_listings_count","availability_365"];
const INT_FIELDS = ["minimum_nights","number_of_reviews","calculated_host_listings_count","availability_365"];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const form = $("#form"), result = $("#result"), btn = $("#predictBtn");
const hoodSelect = $("#neighbourhood");
let apiBase = localStorage.getItem("roomsense_api") || "http://127.0.0.1:8000";
let lastPayload = null;
const history = [];

/* ---------- Borough chips + neighbourhood list ---------- */
function buildBoroughs() {
  $("#boroughs").innerHTML = Object.keys(BOROUGHS).map((b, i) =>
    `<label><input type="radio" name="neighbourhood_group" value="${b}" ${i === 2 ? "checked" : ""}><span>${b}</span></label>`
  ).join("");
  $$('input[name="neighbourhood_group"]').forEach(r => r.addEventListener("change", () => setBorough(r.value, true)));
}

function setBorough(name, moveCoords, hood) {
  const b = BOROUGHS[name];
  hoodSelect.innerHTML = b.hoods.map(h => `<option value="${h}">${h.replace(", Staten Island", " (Staten Island)")}</option>`).join("");
  if (hood) hoodSelect.value = hood;
  if (moveCoords) { setValue("latitude", b.center[0]); setValue("longitude", b.center[1]); }
}

function currentBorough() { return $('input[name="neighbourhood_group"]:checked').value; }

/* ---------- Slider <-> number sync ---------- */
function paintRange(range, v) {
  const min = +range.min, max = +range.max;
  const pct = Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  range.style.setProperty("--p", pct + "%");
}

function setValue(id, v) {
  const input = document.getElementById(id);
  input.value = v;
  input.classList.remove("invalid");
  const range = $(`input[type="range"][data-for="${id}"]`);
  if (range) { range.value = v; paintRange(range, v); }
}

function wireRanges() {
  $$('input[type="range"][data-for]').forEach(range => {
    const num = document.getElementById(range.dataset.for);
    range.addEventListener("input", () => { num.value = range.value; num.classList.remove("invalid"); paintRange(range, range.value); });
    num.addEventListener("input", () => { if (num.value !== "") { range.value = num.value; paintRange(range, num.value); } num.classList.remove("invalid"); });
  });
  hoodSelect.addEventListener("change", () => hoodSelect.classList.remove("invalid"));
}

/* ---------- Presets ---------- */
function applyPreset(key) {
  const p = PRESETS[key];
  $(`input[name="neighbourhood_group"][value="${p.borough}"]`).checked = true;
  setBorough(p.borough, false, p.hood);
  NUM_FIELDS.forEach(f => setValue(f, p[f]));
  form.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/* ---------- Validation (mirrors the Pydantic model) ---------- */
function collect() {
  const errors = [];
  const data = {};
  const rules = {
    latitude: [-90, 90], longitude: [-180, 180], price: [0.01, Infinity], minimum_nights: [1, 365],
    number_of_reviews: [0, Infinity], reviews_per_month: [0, Infinity],
    calculated_host_listings_count: [0, Infinity], availability_365: [0, 365]
  };
  NUM_FIELDS.forEach(f => {
    const el = document.getElementById(f);
    const v = el.value.trim() === "" ? NaN : Number(el.value);
    const [lo, hi] = rules[f];
    const bad = Number.isNaN(v) || v < lo || v > hi || (INT_FIELDS.includes(f) && !Number.isInteger(v));
    el.classList.toggle("invalid", bad);
    if (bad) errors.push(f);
    data[f] = v;
  });
  data.neighbourhood_group = currentBorough();
  data.neighbourhood = hoodSelect.value;
  return { data, errors };
}

/* ---------- API ---------- */
async function predict(payload) {
  const res = await fetch(apiBase.replace(/\/+$/, "") + "/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    let msg = `The server answered with status ${res.status}.`;
    try {
      const body = await res.json();
      if (Array.isArray(body.detail)) {
        msg = body.detail.map(d => `${(d.loc || []).slice(1).join(".") || "input"}: ${d.msg}`).join(" · ");
      } else if (body.detail) msg = String(body.detail);
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  const { data, errors } = collect();
  if (errors.length) {
    form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
    document.getElementById(errors[0]).focus();
    return;
  }
  lastPayload = data;
  await run(data);
});

$("#retry").addEventListener("click", () => lastPayload && run(lastPayload));

async function run(payload) {
  setState("loading");
  btn.classList.add("busy"); btn.disabled = true;
  const started = performance.now();
  try {
    const out = await predict(payload);
    // keep the loading state visible just long enough to feel intentional
    const wait = Math.max(0, 600 - (performance.now() - started));
    await new Promise(r => setTimeout(r, wait));
    showResult(out, payload);
  } catch (err) {
    const offline = err instanceof TypeError;
    $("#errorMsg").textContent = offline
      ? `Can't reach the API at ${apiBase}. Check that uvicorn is running and the address in API settings is correct.`
      : err.message;
    setState("error");
  } finally {
    btn.classList.remove("busy"); btn.disabled = false;
  }
}

/* ---------- Rendering ---------- */
function setState(s) { result.dataset.state = s; }

function showResult(out, payload) {
  const cls = out.Predicted_room_type;
  const probs = out.Probability;
  const classes = Array.isArray(out.classes) && out.classes.length
    ? out.classes : CLASSES;

  if (!Array.isArray(probs) || probs.length !== classes.length ||
      !probs.every(Number.isFinite)) {
    throw new Error("The API returned an invalid probability list. Check the model response.");
  }

  const metaFor = (name) => META[name] || {
    label: String(name), color: "var(--room)",
    blurb: "Predicted room category.",
    icon: '<svg viewBox="0 0 48 48"><rect x="8" y="8" width="32" height="32" rx="5"/></svg>'
  };
  const meta = metaFor(cls);
  const topIdx = probs.indexOf(Math.max(...probs));
  const conf = probs[topIdx] * 100;

  result.dataset.class = cls;
  $("#verdictTitle").textContent = meta.label;
  $("#verdictBlurb").textContent = meta.blurb;
  $("#icon").innerHTML = meta.icon;

  $("#bars").innerHTML = classes.map((c, i) => {
    const item = metaFor(c);
    return `
      <li class="${i === topIdx ? "top" : ""}" style="--bc:${item.color}">
        <span class="name">${item.label}</span><span class="val" data-val="${(probs[i] * 100).toFixed(1)}">0.0%</span>
        <span class="track"><span class="fill"></span></span>
      </li>`;
  }).join("");

  setState("done");
  result.classList.remove("pop"); void result.offsetWidth; result.classList.add("pop");

  // animate after the panel is visible
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $("#arc").style.strokeDashoffset = 339.29 * (1 - conf / 100);
    $$("#bars li").forEach((li, i) => {
      $(".fill", li).style.width = probs[i] * 100 + "%";
      countUp($(".val", li), probs[i] * 100, 1, "%");
    });
    countUp($("#confNum"), conf, 0, "");
  }));

  addHistory(payload, cls, conf);
  if (window.innerWidth <= 920) result.scrollIntoView({ behavior: "smooth", block: "start" });
}

function countUp(el, target, decimals, suffix) {
  if (reduceMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
  const dur = 1100, t0 = performance.now();
  (function tick(now) {
    const t = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = (target * eased).toFixed(decimals) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  })(t0);
}

function addHistory(p, cls, conf) {
  history.unshift({ place: p.neighbourhood, price: p.price, cls, conf });
  history.splice(4);
  $("#history").hidden = false;
  $("#historyList").innerHTML = history.map(h => `
    <li style="--hc:${META[h.cls].color}">
      <span>${h.place.replace(/</g, "&lt;")} · $${h.price}</span>
      <span>${META[h.cls].label} ${h.conf.toFixed(0)}%</span>
    </li>`).join("");
}

/* ---------- API status + settings ---------- */
async function checkStatus() {
  const el = $("#status"), txt = $("#statusText");
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 3000);
    const res = await fetch(apiBase.replace(/\/+$/, "") + "/", { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error();
    el.className = "status online"; txt.textContent = "API online";
  } catch (_) {
    el.className = "status offline"; txt.textContent = "API offline";
  }
}

const dlg = $("#settings");
$("#openSettings").addEventListener("click", () => { $("#apiUrl").value = apiBase; dlg.showModal(); });
dlg.addEventListener("close", () => {
  if (dlg.returnValue === "save" && $("#apiUrl").value.trim()) {
    apiBase = $("#apiUrl").value.trim();
    localStorage.setItem("roomsense_api", apiBase);
    checkStatus();
  }
});

/* ---------- Skyline canvas (twinkling windows) ---------- */
function skyline() {
  const c = $("#skyline"), ctx = c.getContext("2d");
  let w, h, buildings = [], last = 0;
  const dpr = Math.min(devicePixelRatio || 1, 2);

  function build() {
    w = c.clientWidth; h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildings = [];
    let x = -10;
    while (x < w) {
      const bw = 26 + Math.random() * 38;
      const bh = 50 + Math.random() * (h - 70);
      const cols = Math.max(2, Math.floor((bw - 8) / 9)), rows = Math.floor((bh - 10) / 12);
      const wins = [];
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) wins.push({ r, k, on: Math.random() < 0.25 });
      buildings.push({ x, bw, bh, cols, wins });
      x += bw + 2 + Math.random() * 6;
    }
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    buildings.forEach(b => {
      ctx.fillStyle = "#0f1330";
      ctx.fillRect(b.x, h - b.bh, b.bw, b.bh);
      b.wins.forEach(win => {
        ctx.fillStyle = win.on ? "rgba(255,180,84,0.85)" : "rgba(60,68,130,0.35)";
        ctx.fillRect(b.x + 5 + win.k * 9, h - b.bh + 8 + win.r * 12, 4, 6);
      });
    });
  }

  function loop(t) {
    if (t - last > 450) {
      last = t;
      for (let i = 0; i < 6; i++) {
        const b = buildings[(Math.random() * buildings.length) | 0];
        if (b && b.wins.length) { const win = b.wins[(Math.random() * b.wins.length) | 0]; win.on = !win.on; }
      }
      draw();
    }
    requestAnimationFrame(loop);
  }

  build();
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(build, 200); });
  if (!reduceMotion) requestAnimationFrame(loop);
}

/* ---------- Init ---------- */
function initRoomSense() {
  if (!form || !hoodSelect || !$("#boroughs")) {
    console.error("RoomSense: required HTML elements were not found. Check index.html IDs.");
    return;
  }

  buildBoroughs();
  wireRanges();
  setBorough("Manhattan", false);
  applyPreset("home");

  // Keep the dropdown usable even if a preset is changed or the page is restored.
  if (!hoodSelect.options.length) setBorough(currentBorough(), false);
  window.scrollTo(0, 0);

  $$("[data-preset]").forEach(b =>
    b.addEventListener("click", () => applyPreset(b.dataset.preset))
  );

  try { skyline(); } catch (err) { console.warn("RoomSense skyline animation unavailable:", err); }
  checkStatus();
  setInterval(checkStatus, 10000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRoomSense, { once: true });
} else {
  initRoomSense();
}