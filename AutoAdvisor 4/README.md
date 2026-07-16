# AutoAdvisor

AutoAdvisor is a static car research demo with searchable model cards, model-year detail selection, guided recommendations, compare tools, and AAS scoring.

## How to run locally

From inside the project folder, run:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Latest update

- The homepage now shows **one card per car model**, not one card per year.
- Users can open a model card and choose a **model year** inside the popup.
- Changing the year updates estimated price, MPG, horsepower, reliability, maintenance cost, and AAS.
- Compare now lets users pick a **model and year** for Car A and Car B.
- Compare cards are still clickable and open the same details popup.
- The front page no longer shows a specific numeric AAS like 8.7. It shows **AAS -/10** until a year is selected.
- Fake illustrated car SVGs were removed from use.
- The Toyota Camry uses the real image supplied by the user.
- Other models use a neutral “real vehicle photo pending” placeholder until real, approved images are added.

## Data note

The current vehicle prices, MPG, reliability, mileage life, and AAS values are starter estimates for a static demo. They should be verified against current market sources before being used as real buying advice.


## Latest image update

- Added user-supplied real vehicle images for all 36 starter models.
- Each card now labels the image as: `Image shown: 2026 model`.
- Front-page model cards keep AAS, but model-level AAS displays as `-` until a year is selected.
