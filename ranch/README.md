# Ranch

<https://hiessy.github.io/ranch/> — the house in La Cumbre (López y Planes 132),
the former Hostería Norita Ranch, in four views:

- **Floor plan**: ground floor & site, and the upper level. Each room has a number
  and a line in the list beside the plan saying what it is and how sure we are
  (confirmed by us, seen in photos, or a guess). Pointing at a room or its line
  lights it up in both places and shows its photos in a small strip over the
  plan; a click keeps it lit and zooms the plan to it. Beside each room, the
  cube button walks you into it in 3D and the camera opens its photos.
- **3D walk** (`#3d`): a three.js model you walk around in first person, with
  stairs up to the apartment and to the roof terrace, and an overview mode.
  Doors start closed and open with a click (or E), Space jumps (a button on
  touch screens), the furniture follows the listing photos and the
  neighbours' buildings come from the cadastre. A click on the little map
  takes you there.
- **Photos** (`#photos`): the 54 different listing photos, grouped by part of
  the house with the same room's photos together, and a viewer with arrows,
  keys and swipes. A photo of a known room has a tag that lights it on the
  plan, and the viewer can walk you there in 3D.
- **History** (`#history`): a timeline of the town and the house, who owned it,
  the guests' reviews and ratings, and what is around it.

Below them, "What the listings and records say" keeps the cadastre data, the
listings and what the photos show.

The page is in Spanish and English only: `<html data-idiomas="es en">` tells
`/js/i18n.js` to leave out the site's other languages. `/norita-ranch/`, its
old address, only forwards here.

## Files

- `index.html` — structure only; every visible text is an i18n key.
- `js/house.js` — **the one place with measurements**: lot outline, rooms, spaces,
  the street front (doors, windows, gate), inside doors, furniture, glass walls,
  railings, stair ramps and the neighbours' footprints, in meters. x grows
  east, y north, (0, 0) is the lot's south-east corner on the building line.
- `js/plan.js` — draws the plan (SVG) and the room list from `house.js`; hover,
  click and zoom. `PLAN.show(id)` lights a room from another view.
- `js/gallery.js` — the photo list (group, room, caption key), the grid, the
  viewer and the strip over the plan (`GALLERY.peek`, `count`, `open`).
- `js/page.js` — switches between the four views and loads the 3D code the first
  time it is opened, so the other views never download three.js.
- `js/walk.js` — the 3D model and the walking physics. Walls come from the room
  outlines: every edge is a wall unless a door opens it. Floors, railings and
  stone are textures drawn on canvases, so nothing is downloaded but three.js.
- `photos/NN.jpg` (up to 1400 px) and `photos/small/NN.jpg` (480 px), numbered
  in the order of `gallery.js`, without their EXIF data.
- `css/ranch.css`
- `i18n/es.json`, `i18n/en.json` — every text, the photo captions included.

## Changing the house

Fix a room in `js/house.js` and every view follows. Rooms are numbered for
corrections ("14 is L-shaped"), so keep a number once it is given and use the
next free one for anything new. Inside doors and furniture only exist in the
3D model; most doors are guesses. A piece of furniture's `at` is its middle,
placed so its back touches the wall's face, half a wall (7.5 cm) in from the
room's edge. To tie a photo to a room, set its room in `gallery.js`.

After touching texts, check that no key is missing in any language:

```bash
python .claude/skills/i18n/revisar.py
```

The page needs HTTP, like the home page (`python -m http.server 8123`, then
<http://localhost:8123/ranch/>).

## Where the data comes from

The lot outline and areas are the Córdoba cadastre's (IDECOR WFS, layer
`idecor:parcelas`, parcel 23-01-29-11-04-059-053: 765 m² land, 414 m² built);
the neighbours are the parcels around it, each shrunk to its built area.
Buildings were placed from the Google satellite view, Street View and the
listing photos (Zonaprop, Links Propiedades, AlquilerArgentina: 85 files, 54
different pictures), then corrected by us after the visit. The history comes
from those listings, Tripadvisor, Google and HotelVIP reviews, the cadastre
and Wikipedia. Nothing was measured on site.

three.js 0.160.0 comes from jsDelivr, the only thing the page loads from outside
apart from the visits beacon.
