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
  compareBtn: document.getElementById("compareBtn"),
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
  qBody: document.getElementById("qBody"),
  qReliability: document.getElementById("qReliability"),
  qSpace: document.getElementById("qSpace"),
  brandHome: document.getElementById("brandHome"),
  navHome: document.getElementById("navHome"),
  navCompare: document.getElementById("navCompare"),
  navAbout: document.getElementById("navAbout"),
  pageHome: document.getElementById("pageHome"),
  pageCompare: document.getElementById("pageCompare"),
  pageAbout: document.getElementById("pageAbout"),
  compareA: document.getElementById("compareA"),
  compareYearA: document.getElementById("compareYearA"),
  compareB: document.getElementById("compareB"),
  compareYearB: document.getElementById("compareYearB"),
  compareGrid: document.getElementById("compareGrid"),
  compareSummary: document.getElementById("compareSummary"),
  carModal: document.getElementById("carModal"),
  carModalClose: document.getElementById("carModalClose"),
  carModalTitle: document.getElementById("carModalTitle"),
  carModalImg: document.getElementById("carModalImg"),
  carModalScore: document.getElementById("carModalScore"),
  carModalFacts: document.getElementById("carModalFacts"),
  carModalRatings: document.getElementById("carModalRatings"),
  carModalReasons: document.getElementById("carModalReasons"),
  carModalLists: document.getElementById("carModalLists"),
  aasPopover: document.getElementById("aasPopover")
};

const CURRENT_YEAR = 2026;
const MIN_DEFAULT_YEAR = 2015;

let rawCars = [];
let models = [];
let activeQuickFilter = "";
let favorites = loadFavorites();
let activeModalModelId = "";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const launchYears = {
  "mazda-cx-30": 2020,
  "kia-k5": 2021,
  "acura-integra": 2023
};

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

function slugify(value = "") {
  return String(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function modelIdFromCar(car) {
  return `${slugify(car.make)}-${slugify(car.model)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value, nearest) {
  return Math.round(value / nearest) * nearest;
}

function allYearsForModel(car) {
  const id = modelIdFromCar(car);
  const minYear = launchYears[id] || MIN_DEFAULT_YEAR;
  const years = [];
  for (let year = CURRENT_YEAR; year >= minYear; year--) years.push(year);
  return years;
}

function buildModels(cars) {
  return cars.map(car => {
    const id = modelIdFromCar(car);
    const yearData = allYearsForModel(car).map(year => makeYearVariant(car, year));
    return {
      id,
      make: car.make,
      model: car.model,
      body: car.body,
      base: car,
      yearData,
      imageUrl: car.imageUrl,
      hasRealPhoto: Boolean(car.hasRealPhoto)
    };
  });
}

function makeYearVariant(base, year) {
  const baseYear = Number(base.year || 2022);
  const yearOffset = year - baseYear;
  const age = CURRENT_YEAR - year;
  const depreciationFactor = yearOffset >= 0 ? Math.pow(1.07, yearOffset) : Math.pow(0.88, Math.abs(yearOffset));
  const priceMin = roundTo(Math.max(3500, (base.priceEstimateMin || base.price || 15000) * depreciationFactor), 500);
  const priceMax = roundTo(Math.max(priceMin + 2500, (base.priceEstimateMax || base.price || 22000) * depreciationFactor), 500);

  const olderMpgPenalty = year <= 2018 ? 1 : 0;
  const newerMpgBonus = year >= 2024 ? 1 : 0;
  const mpgCity = base.mpgCity ? Math.max(8, base.mpgCity + newerMpgBonus - olderMpgPenalty) : 0;
  const mpgHwy = base.mpgHwy ? Math.max(10, base.mpgHwy + newerMpgBonus - olderMpgPenalty) : 0;
  const horsepower = base.horsepower ? Math.max(70, Math.round(base.horsepower + Math.max(0, yearOffset) * 2 - Math.max(0, -yearOffset) * 1.2)) : 0;

  const reliabilityAdjustment = year >= 2022 ? 0.1 : year <= 2017 ? -0.4 : -0.1;
  const reliabilityScore = Number(clamp((base.reliabilityScore || 7) + reliabilityAdjustment, 1, 10).toFixed(1));
  const aasAdjustment = (year - baseYear) * 0.06 - Math.max(0, age - 5) * 0.05;
  const aas = Number(clamp((base.aas || 7.5) + aasAdjustment, 1, 9.8).toFixed(1));

  const ratings = { ...(base.ratings || {}) };
  if (year >= 2024) ratings.safety = clamp((ratings.safety || 3) + 0.2, 1, 5);
  if (year <= 2017) ratings.value = clamp((ratings.value || 3) + 0.2, 1, 5);
  if (year <= 2017) ratings.comfort = clamp((ratings.comfort || 3) - 0.2, 1, 5);

  let maintenanceCost = base.maintenanceCost || "Estimated";
  if (age >= 8 && maintenanceCost === "Low") maintenanceCost = "Low-Medium";
  if (age >= 8 && maintenanceCost === "Medium") maintenanceCost = "Medium-High";

  return {
    ...base,
    id: `${modelIdFromCar(base)}-${year}`,
    modelId: modelIdFromCar(base),
    year,
    price: Math.round((priceMin + priceMax) / 2),
    priceEstimateMin: priceMin,
    priceEstimateMax: priceMax,
    mpgCity,
    mpgHwy,
    horsepower,
    reliabilityScore,
    maintenanceCost,
    aas,
    ratings,
    notes: `${year} estimates for the ${base.make} ${base.model}. Select another year to update price, MPG, AAS, and ownership details.`,
    imageUrl: base.imageUrl
  };
}

function latestVariant(model) {
  return model.yearData[0];
}

function variantForYear(model, year) {
  const requested = Number(year);
  return model.yearData.find(item => item.year === requested) || latestVariant(model);
}

function avgMpg(car) {
  if (!car.mpgCity && !car.mpgHwy) return 0;
  return Math.round(((car.mpgCity || 0) + (car.mpgHwy || 0)) / 2);
}

function displayMpg(car) {
  if (!car.mpgCity && !car.mpgHwy) return "EV";
  return `${car.mpgCity}/${car.mpgHwy}`;
}

function priceRange(car) {
  if (!car.priceEstimateMin || !car.priceEstimateMax) return money.format(car.price || 0);
  return `${money.format(car.priceEstimateMin)}–${money.format(car.priceEstimateMax)}`;
}

function modelPriceRange(model) {
  const mins = model.yearData.map(item => item.priceEstimateMin);
  const maxes = model.yearData.map(item => item.priceEstimateMax);
  return `${money.format(Math.min(...mins))}–${money.format(Math.max(...maxes))}`;
}

function aasScore(car) {
  return typeof car.aas === "number" ? car.aas.toFixed(1) : "-/";
}

function aasDescription(model, variant = null) {
  if (!variant) {
    return `AAS stands for AutoAdvisor Score. It is a 1–10 overall rating based on reliability, value, MPG, maintenance cost, safety, expected mileage life, and resale value. Choose a year for ${model.make} ${model.model} to see the exact AAS.`;
  }
  return `AAS stands for AutoAdvisor Score. It is a 1–10 overall rating based on reliability, value, MPG, maintenance cost, safety, expected mileage life, and resale value. The ${variant.year} ${model.make} ${model.model} has an estimated AAS of ${aasScore(variant)}/10 in this starter dataset.`;
}

function aasPill(model, variant = null, label = "AAS") {
  const scoreCore = variant ? `${aasScore(variant)}/10` : "-";
  const scoreText = label ? `${label}: ${scoreCore}` : scoreCore;
  const yearAttr = variant ? ` data-aas-year="${variant.year}"` : "";
  return `
    <span class="aas-pill">
      ${scoreText}
      <button class="aas-button" type="button" data-aas-info="${model.id}"${yearAttr} aria-label="What is AAS for ${escapeHtml(model.make)} ${escapeHtml(model.model)}?">i</button>
    </span>
  `;
}

function getTags(model) {
  const car = latestVariant(model);
  const tags = [model.body];
  if ((car.reliabilityScore || 0) >= 9) tags.push("High reliability");
  if (avgMpg(car) >= 35) tags.push("Fuel saver");
  if (Math.min(...model.yearData.map(item => item.priceEstimateMin)) <= 18000) tags.push("Budget years");
  if (["Lexus", "Acura"].includes(model.make)) tags.push("Luxury");
  if (model.body === "Truck") tags.push("Utility");
  return [...new Set(tags)].slice(0, 3);
}

function getReasons(model, variant) {
  const reasons = [];
  if ((variant.reliabilityScore || 0) >= 8) reasons.push("Strong reliability score for a used-car shortlist.");
  if (avgMpg(variant) >= 34) reasons.push("Strong fuel economy for commuting and everyday driving.");
  if (model.body === "SUV") reasons.push("SUV body style gives more passenger and cargo flexibility.");
  if (model.body === "Truck") reasons.push("Truck body style gives better utility for hauling and work use.");
  if (variant.ratings?.performance >= 4) reasons.push("Higher performance rating than many practical commuter options.");
  if (variant.ratings?.resale >= 5) reasons.push("Strong resale value helps protect long-term ownership value.");
  if (variant.bestFor?.length) reasons.push(`Best fit labels: ${variant.bestFor.join(", ")}.`);
  if (!reasons.length) reasons.push(variant.notes || "Balanced option based on the available data.");
  return reasons.slice(0, 5);
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

function populateYearSelect(selectEl, years, label = "Select year") {
  selectEl.innerHTML = `<option value="">${label}</option>`;
  years.forEach(year => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    selectEl.appendChild(option);
  });
}

function populateControls() {
  populateSelect(els.makeSelect, [...new Set(models.map(model => model.make))].sort(), "All makes");
  const allYears = [...new Set(models.flatMap(model => model.yearData.map(item => item.year)))].sort((a, b) => b - a);
  populateYearSelect(els.yearSelect, allYears, "All years");
  populateSelect(els.bodySelect, [...new Set(models.map(model => model.body))].sort(), "All body types");

  const options = models
    .slice()
    .sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`))
    .map(model => `<option value="${model.id}">${escapeHtml(model.make)} ${escapeHtml(model.model)}</option>`)
    .join("");

  els.compareA.innerHTML = `<option value="">Select Car A</option>${options}`;
  els.compareB.innerHTML = `<option value="">Select Car B</option>${options}`;
  populateYearSelect(els.compareYearA, [], "Select year");
  populateYearSelect(els.compareYearB, [], "Select year");
  els.inventoryCount.textContent = models.length;
}

function applyFilters() {
  const q = els.searchInput.value.trim().toLowerCase();
  const make = els.makeSelect.value;
  const year = els.yearSelect.value;
  const body = els.bodySelect.value;
  const maxPrice = Number(els.priceSelect.value || Infinity);
  const sort = els.sortSelect.value;

  let filtered = models.filter(model => {
    const latest = latestVariant(model);
    const searchable = `${model.make} ${model.model} ${model.body} ${latest.notes} ${latest.bestFor?.join(" ") || ""}`.toLowerCase();
    const hasYear = !year || model.yearData.some(item => String(item.year) === String(year));
    const lowestPrice = Math.min(...model.yearData.map(item => item.priceEstimateMin));
    return (!q || searchable.includes(q))
      && (!make || model.make === make)
      && hasYear
      && (!body || model.body === body)
      && (lowestPrice <= maxPrice);
  });

  filtered = applyQuickFilter(filtered);
  filtered = sortModels(filtered, sort);
  renderCards(filtered);
}

function applyQuickFilter(list) {
  if (!activeQuickFilter) return list;
  const filters = {
    budget: model => Math.min(...model.yearData.map(item => item.priceEstimateMin)) <= 18000,
    mpg: model => avgMpg(latestVariant(model)) >= 34,
    reliable: model => (latestVariant(model).reliabilityScore || 0) >= 8,
    suv: model => model.body === "SUV",
    truck: model => model.body === "Truck",
    luxury: model => ["Lexus", "Acura"].includes(model.make),
    favorites: model => favorites.has(model.id)
  };
  return list.filter(filters[activeQuickFilter] || (() => true));
}

function sortModels(list, sort) {
  const sorted = list.slice();
  const sorters = {
    recommended: (a, b) => Number(aasScore(latestVariant(b))) - Number(aasScore(latestVariant(a))),
    priceAsc: (a, b) => Math.min(...a.yearData.map(item => item.priceEstimateMin)) - Math.min(...b.yearData.map(item => item.priceEstimateMin)),
    priceDesc: (a, b) => Math.max(...b.yearData.map(item => item.priceEstimateMax)) - Math.max(...a.yearData.map(item => item.priceEstimateMax)),
    mpgDesc: (a, b) => avgMpg(latestVariant(b)) - avgMpg(latestVariant(a)),
    reliabilityDesc: (a, b) => (latestVariant(b).reliabilityScore || 0) - (latestVariant(a).reliabilityScore || 0),
    yearDesc: (a, b) => latestVariant(b).year - latestVariant(a).year
  };
  sorted.sort(sorters[sort] || sorters.recommended);
  return sorted;
}

function renderCards(list) {
  els.status.textContent = `${list.length} model${list.length === 1 ? "" : "s"}`;
  els.cards.innerHTML = "";
  els.emptyState.hidden = list.length !== 0;

  list.forEach(model => {
    const latest = latestVariant(model);
    const availableYears = `${model.yearData[model.yearData.length - 1].year}–${model.yearData[0].year}`;
    const card = document.createElement("article");
    card.className = "card car-card";
    card.dataset.id = model.id;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `View details for ${model.make} ${model.model}`);
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${escapeHtml(model.imageUrl)}" alt="${escapeHtml(model.make)} ${escapeHtml(model.model)}" loading="lazy">
        ${model.hasRealPhoto ? "" : `<span class="photo-badge">Photo pending</span>`}
        <button class="favorite-btn ${favorites.has(model.id) ? "active" : ""}" type="button" data-favorite="${model.id}" aria-label="Save ${escapeHtml(model.make)} ${escapeHtml(model.model)} to favorites">♥</button>
      </div>
      <p class="image-year-note">Image shown: 2026 model</p>
      <div class="card-body">
        <div class="card-topline">
          <div>
            <h3 class="car-title">${escapeHtml(model.make)} ${escapeHtml(model.model)}</h3>
            <p class="car-meta">${getTags(model).map(tag => `<span class="card-tag">${escapeHtml(tag)}</span>`).join("")}</p>
          </div>
          <span class="price">By year</span>
        </div>
        <p class="card-note">One model card. Open it to choose a year and update price, MPG, AAS, reliability, and other stats.</p>
        <div class="card-stats">
          <div><strong>${availableYears}</strong><span>years</span></div>
          <div><strong>${latest.mileageLife || "—"}</strong><span>mile life</span></div>
          <div><strong>${aasPill(model)}</strong><span>score</span></div>
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
  hideAasPopover();
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

function getRecommendation(model, answers) {
  const car = latestVariant(model);
  const { budget, use, priority, body, reliability, space } = answers;
  const budgetRanges = {
    low: { min: 0, max: 20000, label: "under $20,000" },
    mid: { min: 20000, max: 30000, label: "$20,000–$30,000" },
    high: { min: 30000, max: Infinity, label: "$30,000+" }
  };

  let score = 0;
  const reasons = [];
  const range = budgetRanges[budget];
  const bodyText = (model.body || "").toLowerCase();
  const lowestPrice = Math.min(...model.yearData.map(item => item.priceEstimateMin));
  const highestPrice = Math.max(...model.yearData.map(item => item.priceEstimateMax));

  if (range && lowestPrice <= range.max && highestPrice >= range.min) {
    score += 30;
    reasons.push(`Has years that fit your ${range.label} budget range.`);
  } else if (range && lowestPrice <= range.max + 3500) {
    score += 12;
    reasons.push("Close to your selected budget range depending on year and mileage.");
  } else {
    score -= 8;
  }

  if (body !== "any") {
    if (model.body === body) {
      score += 18;
      reasons.push(`Matches your ${body.toLowerCase()} body preference.`);
    } else {
      score -= 5;
    }
  }

  if (use === "commute") {
    if (["sedan", "hatchback", "coupe"].includes(bodyText)) score += 12;
    if (avgMpg(car) >= 32) {
      score += 16;
      reasons.push("Strong efficiency for daily driving.");
    }
  }
  if (use === "family") {
    if (bodyText === "suv") {
      score += 24;
      reasons.push("SUV layout gives more passenger and cargo flexibility.");
    }
    if (car.ratings?.comfort >= 4) score += 8;
  }
  if (use === "outdoors") {
    if (["suv", "truck"].includes(bodyText)) {
      score += 22;
      reasons.push("SUV/truck layout is better for outdoor or all-weather use.");
    }
    if (["Subaru", "Toyota"].includes(model.make)) score += 5;
  }
  if (use === "work") {
    if (bodyText === "truck") {
      score += 30;
      reasons.push("Truck body style is the strongest fit for work or hauling.");
    } else {
      score -= 7;
    }
  }
  if (use === "first") {
    if (lowestPrice <= 22000) score += 14;
    if ((car.reliabilityScore || 0) >= 8) score += 14;
    if (["Sedan", "Hatchback"].includes(model.body)) reasons.push("Smaller practical layout works well for a first car.");
  }

  if (priority === "mpg") {
    score += Math.min(20, Math.round(avgMpg(car) / 2));
    if (avgMpg(car) >= 34) reasons.push("Matches your fuel-efficiency priority.");
  }
  if (priority === "reliability") {
    score += (car.reliabilityScore || 0) * 2.4;
    if ((car.reliabilityScore || 0) >= 8) reasons.push("Matches your reliability priority.");
  }
  if (priority === "cheap") {
    const priceScore = Math.max(0, 22 - Math.round(lowestPrice / 1400));
    score += priceScore;
    if (lowestPrice <= 18000) reasons.push("Has lower-priced used years in the dataset.");
  }
  if (priority === "space") {
    if (["suv", "truck"].includes(bodyText)) {
      score += 18;
      reasons.push("Matches your space priority.");
    }
  }
  if (priority === "performance") {
    score += (car.ratings?.performance || 0) * 4;
    if ((car.ratings?.performance || 0) >= 4) reasons.push("Stronger performance rating than many practical choices.");
  }
  if (priority === "safety") {
    score += (car.ratings?.safety || 0) * 4;
    if ((car.ratings?.safety || 0) >= 4) reasons.push("Strong safety rating in this dataset.");
  }

  if (reliability === "high") {
    score += (car.reliabilityScore || 0) * 1.7;
    if ((car.reliabilityScore || 0) >= 8) reasons.push("Good fit for a buyer who cares heavily about reliability.");
  }
  if (space === "high" && ["SUV", "Truck"].includes(model.body)) {
    score += 12;
    reasons.push("Better fit for extra passenger or cargo room.");
  }

  score += Number(aasScore(car)) * 3;
  return { model, car, score: Math.max(0, Math.round(score)), reasons: [...new Set(reasons)].slice(0, 4) };
}

function recommendCars() {
  const answers = {
    budget: els.qBudget.value,
    use: els.qUse.value,
    priority: els.qPriority.value,
    body: els.qBody.value,
    reliability: els.qReliability.value,
    space: els.qSpace.value
  };

  if (!answers.budget || !answers.use || !answers.priority) {
    els.starterResults.innerHTML = `<div class="card">Answer the first 3 questions before running the recommendation.</div>`;
    return;
  }

  const top = models
    .map(model => getRecommendation(model, answers))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  els.starterResults.innerHTML = top.map(({ model, car, score, reasons }, index) => `
    <article class="card car-card recommend-card" data-id="${model.id}" tabindex="0" role="button" aria-label="Open ${escapeHtml(model.make)} ${escapeHtml(model.model)} details">
      <div class="recommend-image-block">
        <img src="${escapeHtml(model.imageUrl)}" alt="${escapeHtml(model.make)} ${escapeHtml(model.model)}" loading="lazy">
        <p class="image-year-note compact">Image shown: 2026 model</p>
      </div>
      <div>
        <p class="match-score">#${index + 1} match • Match score: ${score}</p>
        <h3>${escapeHtml(model.make)} ${escapeHtml(model.model)}</h3>
        <p class="compare-note">${modelPriceRange(model)} • ${escapeHtml(model.body)} • open to pick year • ${aasPill(model)}</p>
        <ul class="reason-list">${reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>
      </div>
    </article>
  `).join("");
}

function openCarModal(model, selectedYear = null) {
  activeModalModelId = model.id;
  els.carModal.hidden = false;
  renderCarModalDetails(model, selectedYear || latestVariant(model).year);
}

function renderCarModalDetails(model, selectedYear) {
  const car = variantForYear(model, selectedYear);
  els.carModalTitle.textContent = `${model.make} ${model.model}`;
  els.carModalImg.src = model.imageUrl;
  els.carModalImg.alt = `${model.make} ${model.model}`;
  els.carModalScore.innerHTML = `
    <div class="score-card">
      <div class="year-picker-row">
        <label>
          <span>Model year</span>
          <select id="modalYearSelect" aria-label="Select model year for ${escapeHtml(model.make)} ${escapeHtml(model.model)}">
            ${model.yearData.map(item => `<option value="${item.year}" ${item.year === car.year ? "selected" : ""}>${item.year}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="large-score">${aasPill(model, car, "AAS")}</div>
      <p>${aasDescription(model, car)}</p>
    </div>
  `;
  els.carModalFacts.innerHTML = `
    ${factItem("Selected year", car.year)}
    ${factItem("Estimated price", priceRange(car))}
    ${factItem("Body style", car.body)}
    ${factItem("MPG", `${displayMpg(car)} ${car.mpgCity || car.mpgHwy ? "city/hwy" : ""}`)}
    ${factItem("Horsepower", `${car.horsepower || "—"} hp`)}
    ${factItem("Reliability", `${car.reliabilityScore || "—"}/10`)}
    ${factItem("Mileage life", `${car.mileageLife || "—"}+ miles`)}
    ${factItem("Maintenance", car.maintenanceCost || "Estimated")}
    ${factItem("Favorite", favorites.has(model.id) ? "Saved" : "Not saved")}
    ${factItem("Photo status", model.hasRealPhoto ? "Real image added" : "Real photo pending")}
  `;

  const ratings = {
    Comfort: car.ratings?.comfort ?? 3,
    Performance: car.ratings?.performance ?? 3,
    Longevity: car.ratings?.longevity ?? 3,
    Safety: car.ratings?.safety ?? 3,
    Value: car.ratings?.value ?? 3,
    Resale: car.ratings?.resale ?? 3
  };
  els.carModalRatings.innerHTML = Object.entries(ratings)
    .map(([label, value]) => ratingRow(label, value))
    .join("");

  els.carModalReasons.innerHTML = getReasons(model, car)
    .map(reason => `<li>${escapeHtml(reason)}</li>`)
    .join("");

  els.carModalLists.innerHTML = `
    ${listBlock("Pros", car.pros)}
    ${listBlock("Cons", car.cons)}
    ${listBlock("Common things to check", car.commonIssues)}
    ${listBlock("Years to consider", car.yearsToConsider)}
    ${listBlock("Years to avoid", car.yearsToAvoid)}
  `;
}

function factItem(label, value) {
  return `<div><strong>${escapeHtml(label)}</strong>${escapeHtml(value)}</div>`;
}

function listBlock(title, items = []) {
  return `
    <div>
      <h4>${escapeHtml(title)}</h4>
      <ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
  `;
}

function closeCarModal() {
  els.carModal.hidden = true;
  activeModalModelId = "";
  hideAasPopover();
}

function ratingRow(label, value) {
  const safeValue = Math.max(0, Math.min(5, Number(value) || 0));
  const rounded = Math.round(safeValue);
  const stars = "★".repeat(rounded) + "☆".repeat(5 - rounded);
  return `
    <div class="rating-row">
      <span>${escapeHtml(label)}</span>
      <div class="rating-bar" aria-hidden="true"><span style="width:${safeValue * 20}%"></span></div>
      <strong class="rating-stars" aria-label="${safeValue} out of 5">${stars}</strong>
    </div>
  `;
}

function updateCompareYearSelect(slot) {
  const modelSelect = slot === "A" ? els.compareA : els.compareB;
  const yearSelect = slot === "A" ? els.compareYearA : els.compareYearB;
  const model = models.find(item => item.id === modelSelect.value);
  if (!model) {
    populateYearSelect(yearSelect, [], "Select year");
    return;
  }
  const years = model.yearData.map(item => item.year);
  populateYearSelect(yearSelect, years, "Select year");
  yearSelect.value = String(years[0]);
}

function getCompareSelection(slot) {
  const modelSelect = slot === "A" ? els.compareA : els.compareB;
  const yearSelect = slot === "A" ? els.compareYearA : els.compareYearB;
  const model = models.find(item => item.id === modelSelect.value);
  if (!model) return null;
  const variant = variantForYear(model, yearSelect.value || latestVariant(model).year);
  return { model, variant };
}

function renderCompare() {
  const first = getCompareSelection("A");
  const second = getCompareSelection("B");

  if (!first || !second) {
    els.compareSummary.innerHTML = "Pick two car models and a year for each one. The app will highlight the stronger AAS, value, MPG, reliability, and ownership fit.";
    els.compareGrid.innerHTML = "";
    return;
  }

  const a = first.variant;
  const b = second.variant;

  if (first.model.id === second.model.id && a.year === b.year) {
    els.compareSummary.innerHTML = "You selected the same model year twice. Choose a different model or different year for a better comparison.";
    els.compareGrid.innerHTML = compareCard(first.model, a, b);
    return;
  }

  const cheaper = a.priceEstimateMin === b.priceEstimateMin ? null : (a.priceEstimateMin < b.priceEstimateMin ? first : second);
  const mpgWinner = avgMpg(a) === avgMpg(b) ? null : (avgMpg(a) > avgMpg(b) ? first : second);
  const reliabilityWinner = (a.reliabilityScore || 0) === (b.reliabilityScore || 0) ? null : ((a.reliabilityScore || 0) > (b.reliabilityScore || 0) ? first : second);
  const overallWinner = Number(aasScore(a)) === Number(aasScore(b)) ? null : (Number(aasScore(a)) > Number(aasScore(b)) ? first : second);

  els.compareSummary.innerHTML = `
    <strong>${overallWinner ? `${escapeHtml(overallWinner.model.make)} ${escapeHtml(overallWinner.model.model)}` : "Both choices"}</strong>
    ${overallWinner ? "has the stronger selected-year AAS in this dataset." : "are very close by selected-year AAS."}
    ${cheaper ? `<strong>${escapeHtml(cheaper.model.make)} ${escapeHtml(cheaper.model.model)}</strong> starts at a lower estimated price for the selected year.` : "Starting prices are similar."}
    ${mpgWinner ? `<strong>${escapeHtml(mpgWinner.model.make)} ${escapeHtml(mpgWinner.model.model)}</strong> has better MPG for the selected year.` : "Efficiency is similar."}
    ${reliabilityWinner ? `<strong>${escapeHtml(reliabilityWinner.model.make)} ${escapeHtml(reliabilityWinner.model.model)}</strong> has the stronger reliability score.` : "Reliability is similar."}
  `;

  els.compareGrid.innerHTML = `${compareCard(first.model, a, b)}${compareCard(second.model, b, a)}`;
}

function compareCard(model, car, other) {
  const wins = {
    price: (car.priceEstimateMin || car.price) < (other.priceEstimateMin || other.price),
    mpg: avgMpg(car) > avgMpg(other),
    reliability: (car.reliabilityScore || 0) > (other.reliabilityScore || 0),
    aas: Number(aasScore(car)) > Number(aasScore(other)),
    lifespan: (car.mileageLife || 0) > (other.mileageLife || 0)
  };
  return `
    <article class="card car-card compare-card" data-id="${model.id}" data-year="${car.year}" tabindex="0" role="button" aria-label="Open details for ${escapeHtml(model.make)} ${escapeHtml(model.model)}">
      <img class="compare-img" src="${escapeHtml(model.imageUrl)}" alt="${escapeHtml(model.make)} ${escapeHtml(model.model)}" loading="lazy">
      <p class="image-year-note">Image shown: 2026 model</p>
      <div class="card-body">
        <h2>${escapeHtml(model.make)} ${escapeHtml(model.model)}</h2>
        <p class="compare-note">Selected year: ${car.year}. Click this card to open the same details popup and change the year there too.</p>
        <div class="compare-table">
          ${compareRow("AAS", `${aasScore(car)}/10`, wins.aas, true, model, car)}
          ${compareRow("Estimated price", priceRange(car), wins.price)}
          ${compareRow("Body", car.body, false)}
          ${compareRow("MPG", displayMpg(car), wins.mpg)}
          ${compareRow("Reliability", `${car.reliabilityScore || "—"}/10`, wins.reliability)}
          ${compareRow("Mileage life", `${car.mileageLife || "—"}+`, wins.lifespan)}
          ${compareRow("Maintenance", car.maintenanceCost || "Estimated", false)}
          ${compareRow("Best for", (car.bestFor || []).slice(0, 2).join(", "), false)}
        </div>
      </div>
    </article>
  `;
}

function compareRow(label, value, isWinner, hasAas = false, model = null, variant = null) {
  const displayValue = hasAas && model && variant ? aasPill(model, variant, "") : escapeHtml(value);
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong class="${isWinner ? "win" : ""}">${displayValue}</strong>
    </div>
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

  const aasButton = event.target.closest("[data-aas-info]");
  if (aasButton) {
    event.stopPropagation();
    const year = aasButton.dataset.aasYear ? Number(aasButton.dataset.aasYear) : null;
    showAasPopover(aasButton.dataset.aasInfo, aasButton, year);
    return;
  }

  const card = event.target.closest(".car-card");
  if (!card) return;
  const model = models.find(item => item.id === card.dataset.id);
  const year = card.dataset.year ? Number(card.dataset.year) : null;
  if (model) openCarModal(model, year);
}

function handleCardKey(event) {
  if (event.target.closest("[data-aas-info]") || event.target.closest("[data-favorite]")) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".car-card");
  if (!card) return;
  event.preventDefault();
  const model = models.find(item => item.id === card.dataset.id);
  const year = card.dataset.year ? Number(card.dataset.year) : null;
  if (model) openCarModal(model, year);
}

function showAasPopover(modelId, button, year = null) {
  const model = models.find(item => item.id === modelId);
  if (!model) return;
  const variant = year ? variantForYear(model, year) : null;
  const key = `${modelId}-${year || "model"}`;
  if (!els.aasPopover.hidden && els.aasPopover.dataset.key === key) {
    hideAasPopover();
    return;
  }
  els.aasPopover.textContent = aasDescription(model, variant);
  els.aasPopover.dataset.key = key;
  els.aasPopover.hidden = false;

  const rect = button.getBoundingClientRect();
  const maxLeft = window.innerWidth - 340;
  els.aasPopover.style.left = `${Math.max(12, Math.min(rect.left, maxLeft))}px`;
  els.aasPopover.style.top = `${Math.min(window.innerHeight - 120, rect.bottom + 10)}px`;
}

function hideAasPopover() {
  els.aasPopover.hidden = true;
  els.aasPopover.removeAttribute("data-key");
}

function bindEvents() {
  [els.searchInput, els.makeSelect, els.yearSelect, els.bodySelect, els.priceSelect, els.sortSelect]
    .forEach(input => input.addEventListener("input", applyFilters));

  els.resetBtn.addEventListener("click", resetFilters);
  els.emptyResetBtn.addEventListener("click", resetFilters);
  els.browseBtn.addEventListener("click", () => els.inventorySection.scrollIntoView({ behavior: "smooth" }));
  els.compareBtn.addEventListener("click", () => setPage("compare"));

  document.querySelectorAll(".chip-btn").forEach(button => {
    button.addEventListener("click", () => {
      const nextFilter = button.dataset.filter;
      activeQuickFilter = activeQuickFilter === nextFilter ? "" : nextFilter;
      document.querySelectorAll(".chip-btn").forEach(chip => chip.classList.toggle("active", chip.dataset.filter === activeQuickFilter));
      applyFilters();
    });
  });

  [els.cards, els.compareGrid, els.starterResults].forEach(area => {
    area.addEventListener("click", handleCardOpen);
    area.addEventListener("keydown", handleCardKey);
  });

  document.addEventListener("click", event => {
    if (!event.target.closest("[data-aas-info]") && !event.target.closest("#aasPopover")) hideAasPopover();
  });
  window.addEventListener("scroll", hideAasPopover, { passive: true });
  window.addEventListener("resize", hideAasPopover);

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
  els.carModal.addEventListener("change", event => {
    if (event.target.id !== "modalYearSelect") return;
    const model = models.find(item => item.id === activeModalModelId);
    if (model) renderCarModalDetails(model, Number(event.target.value));
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    closeStarter();
    closeCarModal();
    hideAasPopover();
  });

  els.navHome.addEventListener("click", event => { event.preventDefault(); setPage("home"); });
  els.navCompare.addEventListener("click", event => { event.preventDefault(); setPage("compare"); });
  els.navAbout.addEventListener("click", event => { event.preventDefault(); setPage("about"); });
  els.brandHome.addEventListener("click", () => setPage("home"));

  els.compareA.addEventListener("change", () => { updateCompareYearSelect("A"); renderCompare(); });
  els.compareB.addEventListener("change", () => { updateCompareYearSelect("B"); renderCompare(); });
  els.compareYearA.addEventListener("change", renderCompare);
  els.compareYearB.addEventListener("change", renderCompare);
}

async function init() {
  try {
    const response = await fetch("./data/cars.json");
    if (!response.ok) throw new Error("Could not load car data.");
    rawCars = await response.json();
    models = buildModels(rawCars);
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
