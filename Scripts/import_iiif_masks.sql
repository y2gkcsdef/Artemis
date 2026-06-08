\set ON_ERROR_STOP on

\if :{?data_root}
\else
  \set data_root .
\endif
\cd :'data_root'

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TEMP TABLE import_iiif_mask_raw (
  feature jsonb NOT NULL
) ON COMMIT DROP;

\echo Resolving Gereduceerd Kadaster iiif_tileserver id
SELECT i.id AS gereduceerd_iiif_tileserver_id
FROM iiif_tileserver i
JOIN sublayer s ON s.id = i.sublayer_id
WHERE s.layer_label = 'Gereduceerd Kadaster'
  AND s.label = 'Map'
  AND s.type = 'iiif_tileserver'
\gset

\if :{?gereduceerd_iiif_tileserver_id}
\else
  \echo Could not resolve iiif_tileserver id for Gereduceerd Kadaster Map
  \quit 1
\endif

\echo Loading Gereduceerd Kadaster IIIF masks from IIIFMask/CLEAN/gereduceerd_kadaster.geojson
\copy import_iiif_mask_raw(feature) FROM PROGRAM 'jq -r ''.features[] | [(. | tostring)] | @tsv'' IIIFMask/CLEAN/gereduceerd_kadaster.geojson'

DELETE FROM iiif_mask
WHERE iiif_tileserver_id = :gereduceerd_iiif_tileserver_id;

INSERT INTO iiif_mask (
  iiif_tileserver_id,
  manifest,
  label,
  sprite_x,
  sprite_y,
  sprite_width,
  sprite_height,
  geometry
)
SELECT
  :gereduceerd_iiif_tileserver_id AS iiif_tileserver_id,
  feature #>> '{properties,manifest}' AS manifest,
  feature #>> '{properties,title}' AS label,
  (feature #>> '{properties,sprite_x}')::int AS sprite_x,
  (feature #>> '{properties,sprite_y}')::int AS sprite_y,
  (feature #>> '{properties,sprite_width}')::int AS sprite_width,
  (feature #>> '{properties,sprite_height}')::int AS sprite_height,
  ST_SetSRID(ST_GeomFromGeoJSON(feature -> 'geometry'), 4326)::geometry(Polygon, 4326) AS geometry
FROM import_iiif_mask_raw;

COMMIT;

\echo Imported IIIF masks by iiif_tileserver:
SELECT iiif_tileserver_id, count(*)
FROM iiif_mask
WHERE iiif_tileserver_id = :gereduceerd_iiif_tileserver_id
GROUP BY iiif_tileserver_id
ORDER BY iiif_tileserver_id;
