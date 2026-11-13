# Ranch

<https://hiessy.github.io/ranch/> — the house in La Cumbre (López y Planes 132),
the former Hostería Norita Ranch, in four views:

- **Floor plan**: ground floor & site, the upper level, and the survey's side
  views. The walls, doors (leaf and swing), windows and bath fixtures are the
  2015 survey's own lines, redrawn. Each room has a number and a line in the
  list beside the plan saying what it is and how sure we are. Pointing at a
  room or its line lights it up in both places and shows its photos in a
  small strip over the plan; a click keeps it lit and zooms the plan to it.
  Beside each room, the cube button walks you into it in 3D and the camera
  opens its photos. Red dash-dot lines with letters mark where the survey
  cuts its sections.
- **Side views** (third button of the floor plan): the survey's street front
  and its four sections (A–A toward the back, B–B along the drive, C–C across
  the wing, D–D along the front), with their levels. The 3D model takes its
  heights from them.
- **3D walk** (`#3d`): a three.js model you walk around in first person. Walls
  are the survey's wall outlines raised to the sections' heights: sloping
  ceilings under the old gable roof, the glazed room's shallow vault, the
  apartment's roof falling to the back. Floors sit at the survey's levels
  (+0.35 the front block, +0.20 the glazed room and the wing, +3.00 the
  apartment), so there are steps. Doors start closed and open with a click
  (or E), Space jumps (high enough to clear a railing: every roof can be
  walked on), keys 1, 2 and 3 switch between walking, the overview
  and an aerial view (those two fly like a ghost with WASD, Q and E). The sky
  follows the visitor's clock: sun, moon and stars are where they would be
  over La Cumbre at that hour, lamps and windows light up at night, and the
  "Sky" button tries dawn, midday, dusk and night. The night is dark and
  full of stars, with the Milky Way's glow; the moon is placed and phased
  from a short lunar theory, lit on the side facing the sun; now and then a
  shooting star or, rarely, a comet crosses it. Furniture follows the
  listing photos; the neighbours' buildings come from the cadastre.
- **Photos** (`#photos`): the agency's two walkthrough videos (no sound, with
  chapter buttons), the 54 different listing photos grouped by part of the
  house, and a viewer with arrows, keys and swipes. At the end, the survey's
  drawings as pictures, cut without the title block that names the owner.
- **History** (`#history`): a timeline of the town and the house, who owned it,
  the guests' reviews and ratings, and what is around it.

The page is in Spanish and English only: `<html data-idiomas="es en">` tells
`/js/i18n.js` to leave out the site's other languages. `/norita-ranch/`, its
old address, only forwards here.

## Files

- `index.html` — structure only; every visible text is an i18n key.
- `assets/model/` — the 3D model's own data, free to reuse: `survey.js`, `house.js`
  and `house/` (below). The code that draws it is in `js/`.
- `assets/models/` — the 3D catalog: 103 pieces a house like this has (beds,
  tables, chairs, sofas, wardrobes, fridge, stove, oven, sink units, toilet,
  bidet, basin, bathtub, shower, washing machine, fans, heaters, lamps,
  doors, windows, mirrors, rugs, curtains, a car, a grill...). `catalog.js`
  builds them (meters, standing on y = 0, from boxes and cylinders),
  `export-obj.js` writes Wavefront `.obj` + `.mtl` without any library (the viewer also exports `.glb` with three.js' own exporter), and
  `index.html` is a viewer to browse and download them (a developer page, not
  linked from the site). `obj/` holds the exported files (`.obj` + `.mtl` and a binary `.glb` each), free to reuse. To
  regenerate them: run `python tools/save_server.py`, open the viewer through
  the local server and press "Save all".
- `assets/model/survey.js` — **generated, do not edit**: the survey's geometry. Wall
  polygons per floor, each room's floor outline, every door and window (jamb
  to jamb, wall thickness, hinge and swing), the survey's thin lines as SVG
  path data, and its sections. Made by `tools/` from the survey PDF.
- `assets/model/house.js` — what those shapes are: heights (`tops`, read off the
  sections), roofs, parapets, door and window sizes, stairs, railings, the
  garden, and the lookups (`at`, `topAt`, `polyOf`). It assembles `HOUSE` from
  the data files in `assets/model/house/`: `rooms.js` (names, finishes, ceilings),
  `furniture.js` (every piece, from the photos) and `neighbours.js` (the
  cadastre's parcels). They are classic scripts loaded before it.
- `js/plan.js` — draws the plan and the side views (SVG) and the room list;
  hover, click and zoom. `PLAN.show(id)` lights a room from another view.
- `js/gallery.js` — the photo list, the grid, the viewer and the strip over
  the plan (`GALLERY.peek`, `count`, `open`).
- `js/page.js` — switches between the four views and loads the 3D code the
  first time it is opened, so the other views never download three.js.
- `js/walk.js` — entry of the 3D view (`start`, `goTo`, `pause`, `resume`);
  the rest is in `js/walk/`, a module for each concern: `core` (constants and
  the one state object `S`), `textures`, `materials`, `geometry` (helpers),
  `walls`, `doors`, `openings`, `pieces` (the furniture models), `decor`
  (pictures, mirrors, wall lamps, heaters, curtains), `bathroom` (toilet,
  bidet, basin, shower and how a bath is laid out), `plants` (irises, flower
  beds, shrubs, urns, stepping stones), `furniture` (placing them all, solid
  footprints, sliding wall pieces onto the wall's face), `labels`, `scene` (builds it all),
  `roofs`, `physics` (floors, stairs, collisions), `pointer`, `minimap`, `hud`,
  `controls`, `loop`, `skybar` (the sky button) and `sky` (sun, moon and stars
  by the clock, about 20,000 of them).
- `tools/` — the scripts that read the survey PDF (see below).
- `assets/` (`photos/`, `videos/`, `plans/`) — every picture, video and survey drawing the page uses, free to reuse. `resources/` holds the raw material
  the user drops in; it is ignored by git and never published.
- `css/ranch.css`, `i18n/es.json`, `i18n/en.json`.

## Drawn bigger than the survey

The 3D walk draws the house 1.4 times wider and deeper and 1.25 times
higher than the survey (`K` and `KZ` in `js/walk/core.js`), so rooms and
doors are easy to move through. All the data and the walking physics stay
in the survey's meters; only the drawing is stretched (the `S.world`
group), and furniture, plants and the visitor keep their true size inside
it. The plan view is unchanged. The survey's narrow doors (under 85 cm)
are built 40% wider in the walk, cut out of the wall beside them
(`widenDoors` in `js/walk/walls.js`).

Each room's lamps are one circuit: click any lamp (or press E looking at
it) to turn that room's lights off or on (`js/walk/lights.js`). Pictures,
mirrors, extinguishers and other wall pieces are set on the face of a real
wall, sliding off windows, doorways and furniture (`onWall` in
`js/walk/furniture.js`).

The houses around come from aerial imagery laid over the cadastre and from
Street View (`assets/model/house/neighbours.js`, drawn by `js/walk/town.js`).
The Cristo Redentor stands on its hill 1.19 km east-northeast, at its true
bearing and height above the horizon, drawn nearer and smaller so it looks
the same; it is lit at night (`js/walk/landmarks.js`). Its statue's size is
an estimate. On a dark night a shooting star or a comet crosses every 10 to
60 seconds.

`tools/walk_checks.js` checks these things in the browser: on the 3D
tab, `await (await import("/ranch/tools/walk_checks.js")).run()` returns
what fails each one (doors, wall pieces, lights, the Cristo, the neighbours).

## The axes

Meters. y runs north along the house's inner walls and x grows toward the
street; (0, 0) is the lot's south corner on the building line. Every inner
wall is parallel to an axis, but the building line is not: it leans 2.4°
(`STREET`), so the street front is slightly skewed, as the survey draws it.
True north is `NORTH` (7.82°) clockwise from +y. Heights are above the
sidewalk.

## Changing the house

Rooms are numbered for corrections ("14 is L-shaped"); keep a number once it
is given. What a room is, its finish, height and furniture are in
`assets/model/house.js`. Its shape, walls, doors and windows come from the survey: to
change them, change the list of openings or the room seeds in `tools/sem.py`
and regenerate `assets/model/survey.js`.

Each room's floor is its `fin` in `rooms.js`, one of the finishes drawn in
`js/walk/textures.js` after the photos (diagonal checkerboard, terrazzo,
the bedrooms' patterned tiles, each bath's own floor). A bath's fixtures,
bidet included, are laid out from one line in `furniture.js`: the wall they
stand against, the end the shower is at, the curtain's pattern.

Furniture's `at` is the middle of the piece; everything solid must leave the
doors' approaches free. After a change, check that every room can still be
reached (a flood fill over `blocked()` and `floorAt()` from the street, with
the doors open).

After touching texts, check that no key is missing in any language:

```bash
python .claude/skills/i18n/revisar.py
```

The page needs HTTP, like the home page (`python -m http.server 8123`, then
<http://localhost:8123/ranch/>).

## Reading the survey again

The survey is a vector PDF (an AutoCAD plot at exactly 1:100, with layers).
From a scratch folder with an empty `vec/` in it, and `tools/` copied or
linked beside it:

```bash
python -I tools/pdfvec.py "<the survey>.pdf" vec/vec.json
```

writes every line and text with its layer. Then, with `vec/frame.json`
holding the origins (`{"O": [135.92, 1581.44], "K": 28.3465, "PA": [864.56,
1581.44], "TE": [2257.76, 1581.44]}`: the lot's south corner on the ground,
upper and roof plans, and points per meter):

```bash
python -I tools/walls1.py pb 90 480 740 1700
python -I tools/walls2.py pb tools/extra_pb.json
python -I tools/walls1.py pa 790 480 1500 1700 864.56 1581.44
python -I tools/walls2.py pa
python -I tools/sem.py
python -I tools/mksurvey.py ../ranch/assets/model/survey.js
```

`walls1` and `walls2` turn the wall layer into closed polygons; `sem.py`
finds each opening's jambs from a point given by hand, the way each door
swings from the leaf the survey draws, and flood-fills the rooms;
`mksurvey.py` writes the file. `tile.py` and `vdraw.py` draw any part of the
sheet with a meter grid, to check a wall or a door against the survey.

Two things the survey gets wrong with itself: its upper plan and sections
draw the wing's end 0.95 m deeper than its dimensioned ground plan (we follow
the ground plan), and its level marks for the wing (+0.20) don't match the
0.30 m its sections draw below the front block (we follow the marks).

## Where the data comes from

Walls, doors, windows, rooms, levels and heights come from the survey plan of
August 2015 ("plano de transcripción y relevamiento", 1:100). The cadastre
(IDECOR WFS, layer `idecor:parcelas`, parcel 23-01-29-11-04-059-053: 765 m²
land, 414 m² built) gives the areas and the neighbours. Roof materials,
finishes, furniture and what has changed since 2015 (the grill where the
survey has a carport, the galería's roof and railing) come from the listing
photos (Zonaprop, Links Propiedades, AlquilerArgentina: 54 different
pictures) and the two walkthrough videos. The history comes from those
listings, Tripadvisor, Google and HotelVIP reviews, the cadastre and
Wikipedia. Nothing was measured on site.

three.js 0.160.0 comes from jsDelivr, the only thing the page loads from
outside apart from the visits beacon.
