# Norita Ranch

<https://hiessy.github.io/norita-ranch/> — the house in La Cumbre (López y Planes
132), drawn twice from the same data:

- **Floor plan**: ground floor & site, and the upper level. Each room has a number
  and a line in the list beside the plan saying what it is and how sure we are
  (confirmed by us, seen in photos, or a guess). Pointing at a room or its line
  lights it up in both places; a click keeps it lit and zooms the plan to it.
- **Walk through in 3D**: a three.js model you walk around in first person, with
  stairs up to the apartment and to the roof terrace, and an overview mode.
  `#3d` in the address opens it directly.

Below both, "What the listings and records say" keeps the cadastre data, the
listings, what the photos show and the sources.

## Files

- `index.html` — structure only; every visible text is an i18n key.
- `js/house.js` — **the one place with measurements**: lot outline, rooms, spaces,
  doors, glass walls, railings and stair ramps, in meters. x grows east, y north,
  (0, 0) is the lot's south-east corner on the building line.
- `js/plan.js` — draws the plan (SVG) and the room list from `house.js`; hover,
  click and zoom.
- `js/page.js` — switches between the two views and loads the 3D code the first
  time it is opened, so looking at the plan never downloads three.js.
- `js/walk.js` — the 3D model and the walking physics. Walls come from the room
  outlines: every edge is a wall unless a door opens it.
- `css/norita.css`
- `i18n/es.json`, `i18n/en.json` — every text. `i18n/l33t.json` is generated:
  `python norita-ranch/make_l33t.py` after changing `en.json`.

## Changing the house

Fix a room in `js/house.js` and both views follow. Rooms are numbered for
corrections ("14 is L-shaped"), so keep a number once it is given and use the
next free one for anything new. Doors only exist in the 3D model; most are
guesses.

After touching texts, check that no key is missing in any language:

```bash
python .claude/skills/i18n/revisar.py
```

The page needs HTTP, like the home page (`python -m http.server 8123`, then
<http://localhost:8123/norita-ranch/>).

## Where the data comes from

The lot outline and areas are the Córdoba cadastre's (IDECOR WFS, layer
`idecor:parcelas`, parcel 23-01-29-11-04-059-053: 765 m² land, 414 m² built).
Buildings were placed from the Google satellite view, Street View and about 65
listing photos (Zonaprop, Links Propiedades, AlquilerArgentina), then corrected
by us after the visit. Nothing was measured on site.

three.js 0.160.0 comes from jsDelivr, the only thing the page loads from outside
apart from the visits beacon.
