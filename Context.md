# Artemis — Project Context

## What is Artemis

Artemis is a historical map viewer for the Scheldt/Schelde region, developed for Ghent University (GhentCDH). It allows researchers to explore and compare digitised historical cadastral maps across time. The public-facing name is **Schelde Gemapt**.

---

## Repository

Single monorepo: `Artemis` (personal GitHub account, not GhentCDH)

```
Artemis/
├── client/        # SvelteKit frontend
├── server/        # Express API
├── .env.example
└── CONTEXT.md
```

Tiles are NOT in the repo — they are served locally from a path outside the repo.

---

## Stack

### Frontend — `client/`
- **SvelteKit** (Svelte 5, runes mode)
- **MapLibre GL** — map renderer
- **Vanilla CSS** — no UI framework, no Tailwind
- **pnpm** — package manager
- Runs on `http://localhost:5173` in dev

### Backend — `server/`
- **Express** (Node.js, ESM)
- **pg** — PostgreSQL client
- **cors** — configured for `http://localhost:5173`
- **dotenv** — env config
- Runs on `http://localhost:3000`

### Database
- **PostgreSQL + PostGIS**
- Database name: `Artemis` (capital A)
- All geometry stored in **EPSG:4326**
- Read-only user: `artemis_reader`

### Tiles
- Gereduceerd Kadaster XYZ tiles pre-generated via `gdal2tiles.py`
- Served statically by Express at `/tiles/Gereduceerd_Kadaster_tiles/{z}/{x}/{y}.png`
- Zoom range: z11–z17
- Source warped from EPSG:31370 → EPSG:3857

---

## Database Schema

### `layer`
| column | type |
|---|---|
| label | TEXT (PK in practice) |
| start_year | INT |
| end_year | INT |

### `sublayer`
| column | type |
|---|---|
| id | SERIAL PK |
| layer_label | TEXT (FK → layer.label) |
| label | TEXT |
| type | TEXT — `wmts` \| `iiif_tileserver` \| `parcel` \| `toponym` |
| source | TEXT |
| default_visibility | BOOLEAN |
| sort_order | INT |

### `parcel`
| column | type |
|---|---|
| id | SERIAL PK |
| sublayer_id | INT FK |
| text | TEXT |
| geometry | GEOMETRY(Polygon, 4326) |

### `toponym`
| column | type |
|---|---|
| id | SERIAL PK |
| sublayer_id | INT FK |
| text | TEXT |
| geometry | GEOMETRY(Point, 4326) |
| lon | FLOAT |
| lat | FLOAT |

### `iiif_tileserver`
| column | type |
|---|---|
| id | SERIAL PK |
| sublayer_id | INT FK |
| local_tileserver | TEXT |

### `iiif_mask`
| column | type |
|---|---|
| id | SERIAL PK |
| iiif_tileserver_id | INT FK |
| geometry | GEOMETRY(Polygon, 4326) |
| manifest | TEXT |
| title | TEXT |
| sprite_x | INT |
| sprite_y | INT |
| sprite_width | INT |
| sprite_height | INT |

Full text index: `GIN(to_tsvector('dutch', title))`

### `wmts`
| column | type |
|---|---|
| id | SERIAL PK |
| sublayer_id | INT FK |
| service | TEXT |

### `image_collection` — NOT YET CREATED
### `image` — NOT YET CREATED

---

## API Routes

Base URL: `http://localhost:3000`

| Method | Route | Description |
|---|---|---|
| GET | `/health` | DB connectivity check |
| GET | `/api/layers` | All layers ordered by start_year |
| GET | `/api/layers/range` | `{ range_start, range_end }` — min/max years ±30 |
| GET | `/api/layers/:label/sublayers` | Sublayers for a specific layer |
| STATIC | `/tiles/*` | XYZ tile files |

---

## Layers in Database (chronological)

| Label | Start | End |
|---|---|---|
| Frickx | 1712 | 1712 |
| Villaret | 1745 | 1748 |
| Ferraris | 1771 | 1771 |
| Primitief Kadaster | 1808 | 1834 |
| Poppkaart | 1842 | 1879 |
| Vandermaelen | 1846 | 1846 |
| Gereduceerd Kadaster | 1847 | 1855 |
| NGI 1873 | 1873 | 1873 |
| NGI 1904 | 1904 | 1904 |

Timeline range (from `/api/layers/range`): **1682 – 1934**

---

## Frontend Structure

```
client/src/
├── app.css                          # Global CSS variables + .window class
├── routes/
│   ├── +layout.svelte               # imports app.css
│   └── +page.svelte                 # orchestrates fetchLayers, renders MapCanvas + Timeslider
└── lib/
    ├── stores/
    │   └── layers.ts                # layers store, timelineRange store, fetchLayers()
    └── components/
        ├── map/
        │   └── MapCanvas.svelte     # MapLibre map, OSM baselayer, Belgium center
        └── ui/
            ├── Timeslider.svelte    # timeline bar, axis, ticks, layer blocks
            └── TimesliderLayer.svelte  # individual layer block on timeline
```

---

## Design System

### CSS Variables (app.css)
```css
:root {
  --radius: 10px;
  --border: 0.5px solid rgba(0, 0, 0, 0.1);
  --bg: #ffffff;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
```

### `.window` class
Reusable panel chrome — border, radius, shadow, background. Applied to Timeslider and all floating UI panels.

### Typography
- **DM Sans** — UI labels
- **DM Mono** — year labels, tick marks, monospaced values

### Color philosophy
- **One accent color**: warm ochre `#A8904F` — all interactable elements
- **Brightness = interactability**: bright = active/clickable, desaturated = inactive/background
- Layer blocks: `#8B7355` (muted brown) when inactive

---

## Timeslider — Current State

The timeslider is positioned absolutely at the bottom of the screen (`bottom: 16px`, `left/right: 16px`), wrapped in a `.window` div.

**What works:**
- Fetches layers from `/api/layers` and range from `/api/layers/range`
- Renders horizontal axis line with tick marks every 10 years (rounded to nearest 10)
- Renders layer blocks positioned by `start_year`/`end_year` as percentages of total range
- Multi-track layout: layers assigned to tracks to avoid overlap, even tracks above axis, odd tracks below

**What still needs work:**
- Track layout above/below axis line not fully resolved
- Layer blocks need click interaction (slot assignment)
- Sublayer panel not yet implemented
- No scrubber/cursor yet
- Styling needs to match design spec (ochre accent, DM fonts, proper sizing)

---

## Timeslider — Design Spec

### Layout
- Two rows of layer blocks **above** the axis line
- Two rows of layer blocks **below** the axis line
- Axis line in the center with tick marks and year labels below it
- Window height adjusts dynamically based on track count

### Layer Block Behaviour
- **Idle**: full opacity, `#8B7355` fill
- **Slot A active**: solid ochre ring
- **Slot B active**: dashed ochre ring
- **Dimmed**: reduced opacity when both slots are taken by other layers
- Click to assign to slot A; if slot A taken, assign to slot B
- Second click on active layer deactivates it

### Sublayer Panel
- Opens below the timeslider when a layer block is clicked
- Shows sublayer toggles (Map, Parcels, Toponyms etc.)
- Each sublayer has a type badge and a visibility toggle

---

## Key Decisions

- **No Allmaps** — tiles are pre-generated, not georeferenced at runtime
- **No vector tile server** — parcels/toponyms served as GeoJSON directly from Express
- **No ORM** — raw SQL via `pg`
- **Svelte 5 runes mode** — use `$props()` not `export let`, `$derived` not `$:`
- **EPSG:4326** in PostGIS, **EPSG:3857** for XYZ tiles
- **Tiles not in repo** — too large, deployment concern only
- **Sprite paths** never stored in DB — resolved at runtime from `STATIC_BASE_URL` env var + label convention