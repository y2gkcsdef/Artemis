# Artemis

Artemis is a historical map viewer for the Scheldt/Schelde region. The public-facing name is **Schelde Gemapt**.

## Requirements

- Node.js `20.19+` or `22.12+`
- pnpm `11.x`
- PostgreSQL with PostGIS
- Optional local XYZ tiles are served with the included Node tile server

## Project Structure

```txt
Artemis/
├── client/   # SvelteKit frontend
├── server/   # Express API
└── Tiles/    # optional local XYZ tiles and tile server helpers
```

## PostgreSQL Setup

The repository uses a PostgreSQL custom-format dump for database initialization:

```txt
Dump/artemis_init.dump
```

Custom format is restored with `pg_restore`. It avoids raw SQL runner issues with PostgreSQL
meta-commands and supports recreating the database with `--create`.

Restore the database with an admin PostgreSQL user.

Linux, macOS, or WSL:

```bash
./Dump/restore-artemis.sh
```

Native Windows Command Prompt:

```bat
Dump\restore-artemis.cmd
```

The API only needs read access. After restoring the dump, create the read-only application user:

```sql
CREATE USER artemis_reader WITH PASSWORD 'change-me';

GRANT CONNECT ON DATABASE "Artemis" TO artemis_reader;
GRANT USAGE ON SCHEMA public TO artemis_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO artemis_reader;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO artemis_reader;
```

If your database name, port, user, or password differs, adjust `server/.env` to match.

## API Setup

Install dependencies:

```bash
cd server
pnpm install
```

Create `server/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Artemis
DB_USER=artemis_reader
DB_PASSWORD=change-me
```

Start the API:

```bash
node src/index.js
```

Default API URL:

```txt
http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/health
```

## Client Setup

Install dependencies:

```bash
cd client
pnpm install
```

Start the SvelteKit dev server:

```bash
pnpm dev
```

Default frontend URL:

```txt
http://localhost:5173
```

The static baselayer GeoJSON lives at:

```txt
client/static/baselayer.geojson
```

SvelteKit serves it at:

```txt
/baselayer.geojson
```

Useful client checks:

```bash
pnpm check
pnpm build
```

## Local Tile Server

Local XYZ tile folders are optional. If you download them, serve them with the included Node tile
server:

```bash
cd Tiles
node tile-server.mjs
```

Default local tile URL:

```txt
http://localhost:8080/<tile-folder>/{z}/{x}/{y}.png
```

Example:

```bash
curl -I http://localhost:8080/Gereduceerd_Kadaster_tiles/14/8387/5472.png
```

See `Tiles/README.md` for the optional tile download link and disk space warning.

## API Routes

```txt
GET /health
```

Checks that the API can connect to PostgreSQL.

```txt
GET /api/layers
```

Returns timeline layers: `label`, `start_year`, `end_year`.

```txt
GET /api/layers/range
```

Returns the padded timeline range: `range_start`, `range_end`.

```txt
GET /api/layers/:label/sublayers
```

Returns sublayers for one layer, ordered by `sort_order`.

```txt
GET /api/sublayers/resolve/:id
```

Returns the backing table for a sublayer type.

Current type mapping:

```txt
wmts / wms / wfs -> remote_service
iiif_tileserver -> iiif_tileserver
parcel          -> parcel
toponym         -> toponym
```

```txt
GET /api/remote-services/:sublayerId
```

Returns one `remote_service` row for a sublayer.

```txt
GET /api/iiif-tileservers/:sublayerId
```

Returns one `iiif_tileserver` row for a sublayer.

```txt
GET /api/geojson/:dataset/:sublayerId
```

Returns a GeoJSON FeatureCollection. Current datasets:

```txt
parcel
iiif-mask
```

```txt
GET /api/search?q=:query
```

Searches IIIF manifest labels and toponyms. Queries shorter than two characters return an empty array.

Example route checks:

```bash
curl http://localhost:3000/api/layers
curl "http://localhost:3000/api/layers/Gereduceerd%20Kadaster/sublayers"
curl http://localhost:3000/api/sublayers/resolve/12
curl http://localhost:3000/api/geojson/iiif-mask/12
curl http://localhost:3000/api/geojson/parcel/13
curl "http://localhost:3000/api/search?q=zele"
curl http://localhost:3000/api/remote-services/1
curl http://localhost:3000/api/iiif-tileservers/12
```
