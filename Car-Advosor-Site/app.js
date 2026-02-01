const cards = document.getElementById("cards");
const searchInput = document.getElementById("searchInput");
const makeSelect = document.getElementById("makeSelect");
const yearSelect = document.getElementById("yearSelect");
const status = document.getElementById("status");
const sortSelect = document.getElementById("sortSelect");
const bodySelect = document.getElementById("bodySelect");
const starterBtn = document.getElementById("starterBtn");
const starterModal = document.getElementById("starterModal");
const starterClose = document.getElementById("starterClose");
const starterRun = document.getElementById("starterRun");
const starterResults = document.getElementById("starterResults");

const navHome = document.getElementById("navHome");
const navCompare = document.getElementById("navCompare");
const navAbout = document.getElementById("navAbout");

const pageHome = document.getElementById("pageHome");
const pageCompare = document.getElementById("pageCompare");
const pageAbout = document.getElementById("pageAbout");

const qBudget = document.getElementById("qBudget");
const qUse = document.getElementById("qUse");
const qPriority = document.getElementById("qPriority");

const compareA = document.getElementById("compareA");
const compareB = document.getElementById("compareB");
const compareGrid = document.getElementById("compareGrid");



let cars = [];

function recommendCars() {
  const budget = qBudget.value;     // low | mid | high
  const use = qUse.value;           // commute | family | outdoors | work
  const priority = qPriority.value; // mpg | reliability | cheap | space

  if (!budget || !use || !priority) {
    starterResults.innerHTML = `<div class="card">Answer all 3 questions first.</div>`;
    return;
  }

  // Budget ranges based on your dataset prices
  const budgetMinMax = {
    low:  { min: 0,     max: 18000 },
    mid:  { min: 18000, max: 23000 },
    high: { min: 23000, max: Infinity }
  };

  const { min, max } = budgetMinMax[budget];

  // Scoring function: higher score = better match
  function scoreCar(car) {
    let score = 0;

    // 1) Budget fit (most important)
    if (car.price >= min && car.price < max) score += 6;
    else score -= 2;

    // 2) Use-case match (body type preference)
    const body = (car.body || "").toLowerCase();

    if (use === "commute") {
      // commuters: sedans/hatchbacks + good mpg
      if (body.includes("sedan") || body.includes("hatch")) score += 3;
      if ((car.mpgCity || 0) >= 28) score += 2;
    }

    if (use === "family") {
      // family: SUVs
      if (body.includes("suv")) score += 4;
    }

    if (use === "outdoors") {
      // outdoors: SUVs/trucks
      if (body.includes("suv") || body.includes("truck")) score += 4;
    }

    if (use === "work") {
      // work: trucks
      if (body.includes("truck")) score += 6;
      else score -= 1;
    }

    // 3) Priority (what matters most)
    if (priority === "mpg") {
      score += Math.min(4, Math.floor(((car.mpgCity || 0) + (car.mpgHwy || 0)) / 20));
    } else if (priority === "reliability") {
      score += Math.min(5, (car.reliabilityScore || 0));
    } else if (priority === "cheap") {
      // cheaper = higher score
      score += Math.max(0, 5 - Math.floor((car.price || 999999) / 8000));
    } else if (priority === "space") {
      if (body.includes("suv")) score += 4;
      if (body.includes("truck")) score += 5;
    }

    return score;
  }

  // Score all cars, sort best-first, take top 3
  const top = cars
    .map(car => ({ car, score: scoreCar(car) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Render results inside the modal
  starterResults.innerHTML = top.map(({ car, score }) => `
    <div class="card">
      <strong>${car.year} ${car.make} ${car.model}</strong><br/>
      $${Number(car.price).toLocaleString()} • ${car.body}<br/>
      <span style="opacity:.8">${car.notes || ""}</span><br/>
      <span style="opacity:.6">Match score: ${score}</span>
    </div>
  `).join("");
}


function render(list) {
  cards.innerHTML = "";
  status.textContent = `${list.length} result(s)`;

  list.forEach(car => {
    cards.innerHTML += `
      <div class="card car-card" data-id="${car.id}" style="cursor:pointer;">
        <h3>${car.year} ${car.make} ${car.model}</h3>
        <p>$${car.price.toLocaleString()}</p>
        <p>${car.notes}</p>
      </div>
    `;
  });
}


function applyFilters() {
  const q = searchInput.value.toLowerCase();
  const make = makeSelect.value;
  const year = yearSelect.value;
  const sort = sortSelect.value;
  const body = bodySelect.value;

  let filtered = cars.filter(car =>
    (!q || `${car.make} ${car.model}`.toLowerCase().includes(q)) &&
    (!make || car.make === make) &&
    (!year || car.year == year) &&
    (!body || car.body === body)
  );

  if (sort === "priceAsc") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === "priceDesc") {
    filtered.sort((a, b) => b.price - a.price);
  }

  render(filtered);
}

fetch("./data/cars.json")
  .then(res => res.json())
  .then(data => {
    cars = data;

    // Populate compare dropdowns
if (compareA && compareB) {
  const options = cars
    .slice()
    .sort((a, b) => (`${a.make} ${a.model} ${a.year}`).localeCompare(`${b.make} ${b.model} ${b.year}`))
    .map(c => `<option value="${c.id}">${c.year} ${c.make} ${c.model}</option>`)
    .join("");

  compareA.innerHTML = `<option value="">Select Car A</option>` + options;
  compareB.innerHTML = `<option value="">Select Car B</option>` + options;
}




    [...new Set(data.map(c => c.make))].forEach(m =>
      makeSelect.innerHTML += `<option>${m}</option>`
    );

    [...new Set(data.map(c => c.year))].forEach(y =>
      yearSelect.innerHTML += `<option>${y}</option>`
    );

    [...new Set(data.map(c => c.body))].forEach(b =>
  bodySelect.innerHTML += `<option>${b}</option>`
    );


    render(cars);
  });

  function setPage(which) {
  pageHome.hidden = which !== "home";
  pageCompare.hidden = which !== "compare";
  pageAbout.hidden = which !== "about";

  navHome.classList.toggle("active", which === "home");
  navCompare.classList.toggle("active", which === "compare");
  navAbout.classList.toggle("active", which === "about");
}

searchInput.addEventListener("input", applyFilters);
makeSelect.addEventListener("change", applyFilters);
yearSelect.addEventListener("change", applyFilters);
sortSelect.addEventListener("change", applyFilters);
bodySelect.addEventListener("change", applyFilters);
starterRun.addEventListener("click", recommendCars);
navHome.addEventListener("click", (e) => { e.preventDefault(); setPage("home"); });
navCompare.addEventListener("click", (e) => { 
  e.preventDefault(); 
  setPage("compare");
  renderCompare();
});
navAbout.addEventListener("click", (e) => { e.preventDefault(); setPage("about"); });
cards.addEventListener("click", (e) => {
 const cardEl = e.target.closest(".car-card");
  if (!cardEl) return;

  const id = cardEl.dataset.id;
  const car = cars.find(c => c.id === id);
  if (car) openCarModal(car);
});

function openStarter() {
  starterModal.hidden = false;
  ;
}

function closeStarter() {
  starterModal.hidden = true;
  ;
}

compareA?.addEventListener("change", renderCompare);
compareB?.addEventListener("change", renderCompare);


starterBtn.addEventListener("click", openStarter);
starterClose.addEventListener("click", closeStarter);


// Close when clicking the dark background (but not the modal card)
starterModal.addEventListener("click", (e) => {
  if (e.target === starterModal) closeStarter();
});

setPage("home");

// ---- Car Details Modal (click a card) ----
const carModal = document.getElementById("carModal");
const carModalClose = document.getElementById("carModalClose");
const carModalTitle = document.getElementById("carModalTitle");
const carModalImg = document.getElementById("carModalImg");
const carModalFacts = document.getElementById("carModalFacts");
const carModalRatings = document.getElementById("carModalRatings");



function openCarModal(car) {
  carModal.hidden = false;
  document.body.classList.add("modal-open");

  carModalTitle.textContent = `${car.year} ${car.make} ${car.model}`;

  // Use real image if you add car.imageUrl in cars.json, else placeholder image
 const imgUrl = (car.imageUrl || car.imageUrl1)
  ? (car.imageUrl || car.imageUrl1)
  : `https://placehold.co/900x500?text=${encodeURIComponent(`${car.year} ${car.make} ${car.model}`)}`;

  carModalImg.src = imgUrl;

  carModalFacts.innerHTML = `
    <div style="display:grid; gap:6px;">
      <div><strong>Price:</strong> $${Number(car.price).toLocaleString()}</div>
      <div><strong>Body:</strong> ${car.body}</div>
      <div><strong>MPG:</strong> ${car.mpgCity} city / ${car.mpgHwy} hwy</div>
      <div><strong>Notes:</strong> ${car.notes || "—"}</div>
    </div>
  `;

  // Ratings from cars.json (accurate)
const comfort = clampStars(car.ratings?.comfort ?? 3);
const performance = clampStars(car.ratings?.performance ?? 3);
const longevity = clampStars(car.ratings?.longevity ?? 3);

carModalRatings.innerHTML = `
  ${ratingRow("Comfort", comfort)}
  ${ratingRow("Performance", performance)}
  ${ratingRow("Longevity", longevity)}
`;
}

function closeCarModal() {
  carModal.hidden = true;
  document.body.classList.remove("modal-open");
}

carModalClose?.addEventListener("click", closeCarModal);
carModal?.addEventListener("click", (e) => {
  if (e.target === carModal) closeCarModal();
});

function clampStars(n) {
  return Math.max(0, Math.min(5, n));
}

function bodyBonus(body) {
  const b = (body || "").toLowerCase();
  if (b.includes("suv")) return 1;
  if (b.includes("truck")) return 1;
  if (b.includes("sedan")) return 0;
  if (b.includes("hatch")) return 0;
  return 0;
}

function perfBonus(body) {
  const b = (body || "").toLowerCase();
  if (b.includes("sedan")) return 0;
  if (b.includes("hatch")) return 0;
  if (b.includes("suv")) return 0;
  if (b.includes("truck")) return 0;
  return 0;
}

function ratingRow(label, stars) {
  return `
    <div class="rating-row">
      <div class="rating-label">${label}</div>
      <div class="rating-stars">
        ${renderStars(stars)}
      </div>
    </div>
  `;
}

function renderStars(count) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += `<span class="star ${i <= count ? "filled" : ""}">★</span>`;
  }
  return html;
}

function renderCompare() {
  if (!compareA || !compareB || !compareGrid) return;

  const a = cars.find(c => c.id === compareA.value);
  const b = cars.find(c => c.id === compareB.value);

  if (!a || !b) {
    compareGrid.innerHTML = `<div class="card">Pick two cars to compare.</div>`;
    return;
  }

  compareGrid.innerHTML = `
    ${compareCard(a, "Car A")}
    ${compareCard(b, "Car B")}
  `;
}

function compareCard(car, label) {
  const imgUrl = car.imageUrl
    ? car.imageUrl
    : `https://placehold.co/900x500?text=${encodeURIComponent(`${car.year} ${car.make} ${car.model}`)}`;

  const comfort = clampStars(car.ratings?.comfort ?? 3);
  const performance = clampStars(car.ratings?.performance ?? 3);
  const longevity = clampStars(car.ratings?.longevity ?? 3);

  return `
    <div class="card compare-card">
      <div style="opacity:.8; font-size:12px; margin-bottom:6px;">${label}</div>
      <h2 style="margin:0 0 8px;">${car.year} ${car.make} ${car.model}</h2>
      <img class="compare-img" src="${imgUrl}" alt="${car.year} ${car.make} ${car.model}">
      <div style="display:grid; gap:6px; margin-top:10px;">
        <div><strong>Price:</strong> $${Number(car.price).toLocaleString()}</div>
        <div><strong>Body:</strong> ${car.body}</div>
        <div><strong>MPG:</strong> ${car.mpgCity} city / ${car.mpgHwy} hwy</div>
      </div>

      <div style="display:grid; gap:8px; margin-top:12px;">
        ${ratingRow("Comfort", comfort)}
        ${ratingRow("Performance", performance)}
        ${ratingRow("Longevity", longevity)}
      </div>

      <p style="opacity:.85; margin-top:12px;">${car.notes || ""}</p>
    </div>
  `;
}
  