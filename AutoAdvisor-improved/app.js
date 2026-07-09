const els = {
  cards: document.getElementById("cards"),
  emptyState: document.getElementById("emptyState"),
  emptyResetBtn: document.getElementById("emptyResetBtn"),
  searchInput: document.getElementById("searchInput"),
  makeSelect: document.getElementById("makeSelect"),
  yearSelect: document.getElementById("yearSelect"),
  bodySelect: document.getElementById("bodySelect"),
  priceSelect: document.getElementById("priceSelect"),
  sortSelect: document.getElementById("sortSelect"),
  status: document.getElementById("status"),
  resetBtn: document.getElementById("resetBtn"),
  browseBtn: document.getElementById("browseBtn"),
  inventorySection: document.getElementById("inventorySection"),
  inventoryCount: document.getElementById("inventoryCount"),
  starterBtn: document.getElementById("starterBtn"),
  starterModal: document.getElementById("starterModal"),
  starterClose: document.getElementById("starterClose"),
  starterRun: document.getElementById("starterRun"),
  starterResults: document.getElementById("starterResults"),
  qBudget: document.getElementById("qBudget"),
  qUse: document.getElementById("qUse"),
  qPriority: document.getElementById("qPriority"),
  brandHome: document.getElementById("brandHome"),
  navHome: document.getElementById("navHome"),
  navCompare: document.getElementById("navCompare"),
  navAbout: document.getElementById("navAbout"),
  pageHome: document.getElementById("pageHome"),
  pageCompare: document.getElementById("pageCompare"),
  pageAbout: document.getElementById("pageAbout"),
  compareA: document.getElementById("compareA"),
  compareB: document.getElementById("compareB"),
  compareGrid: document.getElementById("compareGrid"),
  compareSummary: document.getElementById("compareSummary"),
  carModal: document.getElementById("carModal"),
  carModalClose: document.getElementById("carModalClose"),
  carModalTitle: document.getElementById("carModalTitle"),
  carModalImg: document.getElementById("carModalImg"),
  carModalFacts: document.getElementById("carModalFacts"),
  carModalRatings: document.getElementById("carModalRatings"),
  carModalReasons: document.getElementById("carModalReasons")
};

let cars = [];
let activeQuickFilter = "";
let favorites = loadFavorites();

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

function loadFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem("autoAdvisorFavorites") || "[]"));
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  localStorage.setItem("autoAdvisorFavorites", JSON.stringify([...favorites]));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function avgMpg(car) {
  if (!car.mpgCity && !car.mpgHwy) {
    return car.make === "Tesla" ? 120 : 0;
  }
  return Math.round(((car.mpgCity || 0) + (car.mpgHwy || 0)) / 2);
}

function displayMpg(car) {
  if (!car.mpgCity && !car.mpgHwy) return "EV";
  return `${car.mpgCity}/${car.mpgHwy}`;
}

function overallScore(car) {
  const reliability = car.reliabilityScore || 0;
  const ratings = car.ratings || {};
  const ratingAvg = ((ratings.comfort || 0) + (ratings.performance || 0) + (ratings.longevity || 0)) / 3;
  const mpgScore = car.mpgCity || car.mpgHwy ? Math.min(10, avgMpg(car) / 4.5) : 7;
  const priceScore = Math.max(1, 10 - car.price / 4200);
  return Math.round((reliability * 0.36 + ratingAvg * 2 * 0.26 + mpgScore * 0.22 + priceScore * 0.16) * 10);
}

function getTags(car) {
  const tags = [car.body];

  if ((car.reliabilityScore || 0) >= 9) tags.push("High reliability");
  if (avgMpg(car) >= 36) tags.push("Fuel saver");
  if (car.price <= 18000) tags.push("Budget pick");
  if (car.body === "SUV") tags.push("Space");
  if (car.body === "Truck") tags.push("Utility");
  if (car.make === "Tesla") tags.push("EV");

  return [...new Set(tags)].slice(0, 3);
}

function getReasons(car) {
  const reasons = [];

  if (car.price <= 18000) reasons.push("Lower listed price compared with most vehicles in this dataset.");
  if ((car.reliabilityScore || 0) >= 8) reasons.push("Strong reliability score for a used-car shortlist.");
  if (avgMpg(car) >= 35) reasons.push("Strong fuel economy for commuting and everyday driving.");
  if (car.body === "SUV") reasons.push("SUV body style gives more room and flexibility than a sedan.");
  if (car.body === "Truck") reasons.push("Truck body style gives better utility for hauling and work use.");
  if (car.ratings?.performance >= 4) reasons.push("Higher performance rating than many practical commuter options.");
  if (car.make === "Tesla") reasons.push("Electric vehicle option; best fit depends on charging access and insurance costs.");

  if (!reasons.length) reasons.push(car.notes || "Balanced option based on the available data.");
  return reasons.slice(0, 4);
}

function populateSelect(selectEl, values, label) {
  selectEl.innerHTML = `<option value="">${label}</option>`;
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });
}

function populateControls() {
  populateSelect(els.makeSelect, [...new Set(cars.map(car => car.make))].sort(), "All makes");
  populateSelect(els.yearSelect, [...new Set(cars.map(car => car.year))].sort((a, b) => b - a), "All years");
  populateSelect(els.bodySelect, [...new Set(cars.map(car => car.body))].sort(), "All body types");

  const options = cars
    .slice()
    .sort((a, b) => `${a.make} ${a.model} ${a.year}`.localeCompare(`${b.make} ${b.model} ${b.year}`))
    .map(car => `<option value="${escapeHtml(car.id)}">${car.year} ${escapeHtml(car.make)} ${escapeHtml(car.model)}</option>`)
    .join("");

  els.compareA.innerHTML = `<option value="">Select Car A</option>${options}`;
  els.compareB.innerHTML = `<option value="">Select Car B</option>${options}`;
  els.inventoryCount.textContent = cars.length;
}

function applyFilters() {
  const q = els.searchInput.value.trim().toLowerCase();
  const make = els.makeSelect.value;
  const year = els.yearSelect.value;
  const body = els.bodySelect.value;
  const maxPrice = Number(els.priceSelect.value || Infinity);
  const sort = els.sortSelect.value;

  let filtered = cars.filter(car => {
    const searchable = `${car.year} ${car.make} ${car.model} ${car.body} ${car.notes}`.toLowerCase();

    return (!q || searchable.includes(q)) &&
      (!make || car.make === make) &&
      (!year || String(car.year) === String(year)) &&
      (!body || car.body === body) &&
      (car.price <= maxPrice);
  });

  filtered = applyQuickFilter(filtered);
  filtered = sortCars(filtered, sort);
  renderCards(filtered);
}

function applyQuickFilter(list) {
  if (!activeQuickFilter) return list;

  const filters = {
    budget: car => car.price <= 18000,
    mpg: car => avgMpg(car) >= 35 || car.make === "Tesla",
    reliable: car => (car.reliabilityScore || 0) >= 9,
    suv: car => car.body === "SUV",
    favorites: car => favorites.has(car.id)
  };

  return list.filter(filters[activeQuickFilter] || (() => true));
}

function sortCars(list, sort) {
  const sorted = list.slice();

  const sorters = {
    recommended: (a, b) => overallScore(b) - overallScore(a),
    priceAsc: (a, b) => a.price - b.price,
    priceDesc: (a, b) => b.price - a.price,
    mpgDesc: (a, b) => avgMpg(b) - avgMpg(a),
    reliabilityDesc: (a, b) => (b.reliabilityScore || 0) - (a.reliabilityScore || 0),
    yearDesc: (a, b) => b.year - a.year
  };

  sorted.sort(sorters[sort] || sorters.recommended);
  return sorted;
}

function renderCards(list) {
  els.status.textContent = `${list.length} result${list.length === 1 ? "" : "s"}`;
  els.cards.innerHTML = "";
  els.emptyState.hidden = list.length !== 0;

  list.forEach(car => {
    const card = document.createElement("article");
    card.className = "card car-card";
    card.dataset.id = car.id;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `View details for ${car.year} ${car.make} ${car.model}`);

    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${escapeHtml(car.imageUrl)}" alt="${car.year} ${escapeHtml(car.make)} ${escapeHtml(car.model)}" loading="lazy">
        <button class="favorite-btn ${favorites.has(car.id) ? "active" : ""}" data-favorite="${escapeHtml(car.id)}" aria-label="Save ${escapeHtml(car.make)} ${escapeHtml(car.model)} as favorite">♥</button>
      </div>
      <div class="card-body">
        <div class="card-topline">
          <div>
            <h3 class="car-title">${car.year} ${escapeHtml(car.make)} ${escapeHtml(car.model)}</h3>
            <div class="car-meta">${getTags(car).map(tag => `<span class="card-tag">${escapeHtml(tag)}</span>`).join("")}</div>
          </div>
          <div class="price">${money.format(car.price)}</div>
        </div>
        <p class="card-note">${escapeHtml(car.notes || "")}</p>
        <div class="card-stats">
          <div><strong>${displayMpg(car)}</strong><span>city/hwy</span></div>
          <div><strong>${car.reliabilityScore || "—"}/10</strong><span>reliability</span></div>
          <div><strong>${overallScore(car)}</strong><span>score</span></div>
        </div>
      </div>
    `;

    els.cards.appendChild(card);
  });
}

function resetFilters() {
  els.searchInput.value = "";
  els.makeSelect.value = "";
  els.yearSelect.value = "";
  els.bodySelect.value = "";
  els.priceSelect.value = "";
  els.sortSelect.value = "recommended";
  activeQuickFilter = "";
  document.querySelectorAll(".chip-btn").forEach(button => button.classList.remove("active"));
  applyFilters();
}

function setPage(which) {
  els.pageHome.hidden = which !== "home";
  els.pageCompare.hidden = which !== "compare";
  els.pageAbout.hidden = which !== "about";

  els.navHome.classList.toggle("active", which === "home");
  els.navCompare.classList.toggle("active", which === "compare");
  els.navAbout.classList.toggle("active", which === "about");

  if (which === "compare") renderCompare();
  history.replaceState(null, "", `#${which}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openStarter() {
  els.starterModal.hidden = false;
  els.qBudget.focus();
}

function closeStarter() {
  els.starterModal.hidden = true;
}

function getRecommendation(car, answers) {
  const { budget, use, priority } = answers;
  const budgetRanges = {
    low: { min: 0, max: 18000, label: "under $18,000" },
    mid: { min: 18000, max: 23000, label: "$18,000–$23,000" },
    high: { min: 23000, max: Infinity, label: "$23,000+" }
  };

  let score = 0;
  const reasons = [];
  const range = budgetRanges[budget];
  const body = (car.body || "").toLowerCase();

  if (car.price >= range.min && car.price < range.max) {
    score += 35;
    reasons.push(`Fits your ${range.label} budget range.`);
  } else if (car.price <= range.max + 2500) {
    score += 14;
    reasons.push("Close to your selected budget range.");
  } else {
    score -= 10;
  }

  if (use === "commute") {
    if (body.includes("sedan") || body.includes("hatch")) {
      score += 16;
      reasons.push("Sedan/hatchback layout works well for commuting.");
    }
    if (avgMpg(car) >= 32 || car.make === "Tesla") {
      score += 18;
      reasons.push("Strong efficiency for daily driving.");
    }
  }

  if (use === "family") {
    if (body.includes("suv")) {
      score += 26;
      reasons.push("SUV body style supports more passenger and cargo space.");
    }
    if (car.ratings?.comfort >= 4) {
      score += 8;
      reasons.push("Comfort rating is strong for family use.");
    }
  }

  if (use === "outdoors") {
    if (body.includes("suv") || body.includes("truck")) {
      score += 24;
      reasons.push("SUV/truck body style is better for light outdoor use.");
    }
  }

  if (use === "work") {
    if (body.includes("truck")) {
      score += 30;
      reasons.push("Truck body style is the best fit for work or hauling.");
    } else {
      score -= 6;
    }
  }

  if (priority === "mpg") {
    const mpg = avgMpg(car);
    score += car.make === "Tesla" ? 18 : Math.min(18, Math.round(mpg / 2.5));
    if (mpg >= 35 || car.make === "Tesla") reasons.push("Matches your fuel-efficiency priority.");
  }

  if (priority === "reliability") {
    score += (car.reliabilityScore || 0) * 2.2;
    if ((car.reliabilityScore || 0) >= 8) reasons.push("Matches your reliability priority.");
  }

  if (priority === "cheap") {
    const priceScore = Math.max(0, 20 - Math.round(car.price / 1600));
    score += priceScore;
    if (car.price <= 18000) reasons.push("One of the lower-priced choices in the dataset.");
  }

  if (priority === "space") {
    if (body.includes("suv")) score += 18;
    if (body.includes("truck")) score += 20;
    if (body.includes("suv") || body.includes("truck")) reasons.push("Matches your space priority.");
  }

  score += Math.round(overallScore(car) / 10);

  return {
    car,
    score: Math.max(0, Math.round(score)),
    reasons: [...new Set(reasons)].slice(0, 3)
  };
}

function recommendCars() {
  const answers = {
    budget: els.qBudget.value,
    use: els.qUse.value,
    priority: els.qPriority.value
  };

  if (!answers.budget || !answers.use || !answers.priority) {
    els.starterResults.innerHTML = `<div class="card">Answer all 3 questions first.</div>`;
    return;
  }

  const top = cars
    .map(car => getRecommendation(car, answers))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  els.starterResults.innerHTML = top.map(({ car, score, reasons }, index) => `
    <article class="card recommend-card">
      <img src="${escapeHtml(car.imageUrl)}" alt="${car.year} ${escapeHtml(car.make)} ${escapeHtml(car.model)}">
      <div>
        <span class="badge">#${index + 1} match</span>
        <h3>${car.year} ${escapeHtml(car.make)} ${escapeHtml(car.model)}</h3>
        <p class="card-note">${money.format(car.price)} • ${escapeHtml(car.body)} • ${displayMpg(car)} MPG</p>
        <p class="match-score">Match score: ${score}</p>
        <ul class="reason-list">${reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>
      </div>
    </article>
  `).join("");
}

function openCarModal(car) {
  els.carModal.hidden = false;
  els.carModalTitle.textContent = `${car.year} ${car.make} ${car.model}`;
  els.carModalImg.src = car.imageUrl;
  els.carModalImg.alt = `${car.year} ${car.make} ${car.model}`;

  els.carModalFacts.innerHTML = `
    <div class="fact-grid">
      <div><strong>Price</strong>${money.format(car.price)}</div>
      <div><strong>Body style</strong>${escapeHtml(car.body)}</div>
      <div><strong>MPG</strong>${displayMpg(car)} ${car.make === "Tesla" ? "" : "city/hwy"}</div>
      <div><strong>Reliability</strong>${car.reliabilityScore || "—"}/10</div>
      <div><strong>Overall score</strong>${overallScore(car)}</div>
      <div><strong>Favorite</strong>${favorites.has(car.id) ? "Saved" : "Not saved"}</div>
    </div>
    <p class="card-note" style="margin-top:14px; margin-bottom:0;">${escapeHtml(car.notes || "")}</p>
  `;

  const ratings = {
    Comfort: car.ratings?.comfort ?? 3,
    Performance: car.ratings?.performance ?? 3,
    Longevity: car.ratings?.longevity ?? 3
  };

  els.carModalRatings.innerHTML = Object.entries(ratings)
    .map(([label, value]) => ratingRow(label, value))
    .join("");

  els.carModalReasons.innerHTML = getReasons(car)
    .map(reason => `<li>${escapeHtml(reason)}</li>`)
    .join("");
}

function closeCarModal() {
  els.carModal.hidden = true;
}

function ratingRow(label, value) {
  const safeValue = Math.max(0, Math.min(5, Number(value) || 0));
  const stars = "★".repeat(safeValue) + "☆".repeat(5 - safeValue);

  return `
    <div class="rating-row">
      <span>${escapeHtml(label)}</span>
      <div class="rating-bar" aria-hidden="true"><span style="--value:${safeValue}"></span></div>
      <strong class="rating-stars" aria-label="${safeValue} out of 5 stars">${stars}</strong>
    </div>
  `;
}

function renderCompare() {
  const a = cars.find(car => car.id === els.compareA.value);
  const b = cars.find(car => car.id === els.compareB.value);

  if (!a || !b) {
    els.compareSummary.innerHTML = "Pick two cars to compare. The app will highlight the stronger value, MPG, reliability, and overall score.";
    els.compareGrid.innerHTML = "";
    return;
  }

  const cheaper = a.price === b.price ? null : (a.price < b.price ? a : b);
  const mpgWinner = avgMpg(a) === avgMpg(b) ? null : (avgMpg(a) > avgMpg(b) ? a : b);
  const reliabilityWinner = (a.reliabilityScore || 0) === (b.reliabilityScore || 0) ? null : ((a.reliabilityScore || 0) > (b.reliabilityScore || 0) ? a : b);
  const overallWinner = overallScore(a) === overallScore(b) ? null : (overallScore(a) > overallScore(b) ? a : b);

  els.compareSummary.innerHTML = `
    <strong>${overallWinner ? `${overallWinner.year} ${escapeHtml(overallWinner.make)} ${escapeHtml(overallWinner.model)}` : "Both cars"}</strong>
    ${overallWinner ? "has the stronger overall score in this dataset." : "are very close by overall score."}
    ${cheaper ? `<strong>${cheaper.make} ${cheaper.model}</strong> is cheaper.` : "They are listed at the same price."}
    ${mpgWinner ? `<strong>${mpgWinner.make} ${mpgWinner.model}</strong> has better MPG/efficiency.` : "Efficiency is similar."}
  `;

  els.compareGrid.innerHTML = `
    ${compareCard(a, b)}
    ${compareCard(b, a)}
  `;
}

function compareCard(car, other) {
  const wins = {
    price: car.price < other.price,
    mpg: avgMpg(car) > avgMpg(other),
    reliability: (car.reliabilityScore || 0) > (other.reliabilityScore || 0),
    score: overallScore(car) > overallScore(other)
  };

  return `
    <article class="card compare-card">
      <img class="compare-img" src="${escapeHtml(car.imageUrl)}" alt="${car.year} ${escapeHtml(car.make)} ${escapeHtml(car.model)}">
      <div class="card-body">
        <h2>${car.year} ${escapeHtml(car.make)} ${escapeHtml(car.model)}</h2>
        <p class="compare-note">${escapeHtml(car.notes || "")}</p>
        <div class="compare-table">
          <div><span>Price</span><strong class="${wins.price ? "win" : ""}">${money.format(car.price)}</strong></div>
          <div><span>Body</span><strong>${escapeHtml(car.body)}</strong></div>
          <div><span>MPG</span><strong class="${wins.mpg ? "win" : ""}">${displayMpg(car)}</strong></div>
          <div><span>Reliability</span><strong class="${wins.reliability ? "win" : ""}">${car.reliabilityScore || "—"}/10</strong></div>
          <div><span>Overall score</span><strong class="${wins.score ? "win" : ""}">${overallScore(car)}</strong></div>
        </div>
        <div class="ratings-list">${ratingRow("Comfort", car.ratings?.comfort ?? 3)}${ratingRow("Performance", car.ratings?.performance ?? 3)}${ratingRow("Longevity", car.ratings?.longevity ?? 3)}</div>
      </div>
    </article>
  `;
}

function toggleFavorite(id) {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);

  saveFavorites();
  applyFilters();
  renderCompare();
}

function handleCardOpen(event) {
  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) {
    event.stopPropagation();
    toggleFavorite(favoriteButton.dataset.favorite);
    return;
  }

  const card = event.target.closest(".car-card");
  if (!card) return;

  const car = cars.find(item => item.id === card.dataset.id);
  if (car) openCarModal(car);
}

function handleCardKey(event) {
  if (event.key !== "Enter" && event.key !== " ") return;

  const card = event.target.closest(".car-card");
  if (!card) return;

  event.preventDefault();
  const car = cars.find(item => item.id === card.dataset.id);
  if (car) openCarModal(car);
}

function bindEvents() {
  [els.searchInput, els.makeSelect, els.yearSelect, els.bodySelect, els.priceSelect, els.sortSelect]
    .forEach(input => input.addEventListener("input", applyFilters));

  els.resetBtn.addEventListener("click", resetFilters);
  els.emptyResetBtn.addEventListener("click", resetFilters);
  els.browseBtn.addEventListener("click", () => els.inventorySection.scrollIntoView({ behavior: "smooth" }));

  document.querySelectorAll(".chip-btn").forEach(button => {
    button.addEventListener("click", () => {
      const nextFilter = button.dataset.filter;
      activeQuickFilter = activeQuickFilter === nextFilter ? "" : nextFilter;
      document.querySelectorAll(".chip-btn").forEach(chip => chip.classList.toggle("active", chip.dataset.filter === activeQuickFilter));
      applyFilters();
    });
  });

  els.cards.addEventListener("click", handleCardOpen);
  els.cards.addEventListener("keydown", handleCardKey);

  els.starterBtn.addEventListener("click", openStarter);
  els.starterClose.addEventListener("click", closeStarter);
  els.starterRun.addEventListener("click", recommendCars);

  els.starterModal.addEventListener("click", event => {
    if (event.target === els.starterModal) closeStarter();
  });

  els.carModalClose.addEventListener("click", closeCarModal);
  els.carModal.addEventListener("click", event => {
    if (event.target === els.carModal) closeCarModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    closeStarter();
    closeCarModal();
  });

  els.navHome.addEventListener("click", event => { event.preventDefault(); setPage("home"); });
  els.navCompare.addEventListener("click", event => { event.preventDefault(); setPage("compare"); });
  els.navAbout.addEventListener("click", event => { event.preventDefault(); setPage("about"); });
  els.brandHome.addEventListener("click", () => setPage("home"));

  els.compareA.addEventListener("change", renderCompare);
  els.compareB.addEventListener("change", renderCompare);
}

async function init() {
  try {
    const response = await fetch("./data/cars.json");
    if (!response.ok) throw new Error("Could not load car data.");

    cars = await response.json();
    populateControls();
    bindEvents();
    applyFilters();

    const page = location.hash.replace("#", "");
    if (["home", "compare", "about"].includes(page)) setPage(page);
    else setPage("home");
  } catch (error) {
    els.status.textContent = "Could not load vehicle data.";
    els.cards.innerHTML = `<div class="card">${escapeHtml(error.message)}</div>`;
  }
}

init();
