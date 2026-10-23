# Sprite sheet assets

Drop the AI-generated sprite sheets here and the game switches from the
built-in pixel-map sprites to these automatically (missing files = automatic
fallback, nothing breaks):

| File | Contents |
|---|---|
| `sheet_basketball.png` | Basketball shooting spritesheet — STAND / SHOOT PREP / SHOOT / FOLLOW THROUGH rows (4 frames each) + 3×3 basketball grid |
| `sheet_sports.png` | 4-in-1 sheet — soccer (top-left), ice hockey (top-right), tennis (bottom-left), handball (bottom-right), each with pose rows + balls + goal |

Slicing coordinates live in `../js/sheets.js` (fractional bands per pose row,
auto-trimmed to content). If frames come out misaligned, tweak the fractions
there — the browser console logs which sports and how many frames loaded.

With both sheets present the rank rotation becomes:
basketball → soccer → hockey → tennis → handball.

The loader makes sheet backgrounds transparent automatically (flood-fill from
each frame's border), so sheets don't need alpha channels.

## Scene backgrounds (optional)

Drop AI-generated backgrounds here and they replace the procedural street:

| File | Used for |
|---|---|
| `bg.png` | Shared background for every sport |
| `bg_basketball.png`, `bg_soccer.png`, `bg_hockey.png`, `bg_tennis.png`, `bg_handball.png` | Per-sport backgrounds (win over `bg.png`) |

Generation tips: wide landscape (e.g. 1536×340, roughly 4.5:1), same pixel-art
style as the sprites, night urban street seen from the side, flat empty ground
along the bottom ~15%, and NO players or goals in the image — the game draws
those on top (player at left, goal/hoop at right). The image is cover-fit and
bottom-anchored, so extra width is cropped on the right.
