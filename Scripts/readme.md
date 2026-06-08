# Data preprocessing and import scripts

These utilities normalize the external map data into import-ready GeoJSON files and import those
files into the Artemis PostgreSQL database. Run the commands below from the Artemis repository
root.

The source map data is not stored in this repository. Pass its root directory to the scripts:

```bash
DATA_ROOT=/path/to/map-data
```

The expected directories below, such as `Ferraris`, `Primitief_Kadaster`, and
`Gereduceerd_Kadaster`, must exist directly inside `DATA_ROOT`. Generated files are also written
inside `DATA_ROOT`.

## Requirements

- Python 3.10+
- Python packages `pyproj` and, for IIIF masks, GDAL's `osgeo` Python bindings
- PostgreSQL client `psql`
- PostgreSQL with PostGIS
- `jq`, used by the SQL import scripts
- A database user with permission to create the PostGIS extension and modify the target tables

## Preprocessing

All Python preprocessors accept:

```txt
--data-root PATH  Root containing the source map-data directories.
                  Defaults to the Artemis repository root.
```

Show the built-in help for any script with `python3 Scripts/<script>.py --help`.

### Toponyms

```bash
python3 Scripts/preprocess_toponyms.py --data-root "$DATA_ROOT"
```

Reads `*.geojson` files from:

- `Ferraris/Toponyms`
- `Primitief_Kadaster/Toponyms`
- `Gereduceerd_Kadaster/Toponyms`

It validates the `text` property, accepts Polygon and MultiPolygon geometry, calculates centroid
coordinates, and writes normalized EPSG:4326 files to `Toponyms/CLEAN`.

### Parcels

```bash
python3 Scripts/preprocess_parcels.py --data-root "$DATA_ROOT"
```

Reads `Primitief_Kadaster/Parcels/*.geojson`, keeps features whose `type` property is `parcel`,
maps `parcel_number` to `text`, and writes `Parcels/CLEAN/primitief_kadaster.geojson`.
Parcel geometry must be Polygon geometry.

### IIIF masks

```bash
python3 Scripts/preprocess_iiif_masks.py --data-root "$DATA_ROOT"
```

Reads Gereduceerd Kadaster mask shapefiles from `Gereduceerd_Kadaster/manifests` and sprite
metadata from `Gereduceerd_Kadaster/Sprites/sprites.json`. It matches masks to sprites, transforms
geometry from EPSG:31370 to EPSG:4326, and writes:

- `IIIFMask/CLEAN/gereduceerd_kadaster.geojson`
- `IIIFMask/CLEAN/gereduceerd_kadaster_match_report.json`

The script stops and writes a report if mask and sprite counts do not match.

## Database imports

Run preprocessing before the matching import. Pass `data_root` to `psql`; each SQL script changes
its working directory to that location before reading generated files. Paths with spaces are
supported.

Use a database administrator or another write-enabled database user, not the read-only
`artemis_reader` account:

```bash
psql -d Artemis -v data_root="$DATA_ROOT" -f Scripts/import_toponyms.sql
psql -d Artemis -v data_root="$DATA_ROOT" -f Scripts/import_parcels.sql
psql -d Artemis -v data_root="$DATA_ROOT" -f Scripts/import_iiif_masks.sql
```

Add normal `psql` connection options when needed, for example `-h localhost -p 5432 -U postgres`.

Import behavior:

- `import_toponyms.sql` appends Ferraris and Gereduceerd Kadaster records to `toponym`.
- `import_parcels.sql` replaces parcels for sublayer `10`.
- `import_iiif_masks.sql` resolves the Gereduceerd Kadaster Map IIIF tileserver and replaces its
  masks.

If the map-data directories are placed directly in the Artemis repository root, omit
`--data-root` for Python and `-v data_root=...` for `psql`.
