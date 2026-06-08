\set ON_ERROR_STOP on

\if :{?data_root}
\else
  \set data_root .
\endif
\cd :'data_root'

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TEMP TABLE import_toponym_raw (
  source_layer text NOT NULL,
  feature jsonb NOT NULL
) ON COMMIT DROP;

\echo Loading Ferraris toponyms from Toponyms/CLEAN/ferraris.geojson
\copy import_toponym_raw(source_layer, feature) FROM PROGRAM 'jq -r ''.features[] | ["ferraris", (. | tostring)] | @tsv'' Toponyms/CLEAN/ferraris.geojson'

\echo Loading Gereduceerd Kadaster toponyms from Toponyms/CLEAN/gereduceerd_kadaster.geojson
\copy import_toponym_raw(source_layer, feature) FROM PROGRAM 'jq -r ''.features[] | ["gereduceerd_kadaster", (. | tostring)] | @tsv'' Toponyms/CLEAN/gereduceerd_kadaster.geojson'

INSERT INTO toponym (sublayer_id, text, geometry, lon, lat)
SELECT
  CASE source_layer
    WHEN 'ferraris' THEN 3
    WHEN 'gereduceerd_kadaster' THEN 14
  END AS sublayer_id,
  feature #>> '{properties,text}' AS text,
  ST_SetSRID(ST_GeomFromGeoJSON(feature -> 'geometry'), 4326) AS geometry,
  (feature #>> '{properties,location_x}')::double precision AS lon,
  (feature #>> '{properties,location_y}')::double precision AS lat
FROM import_toponym_raw;

COMMIT;

\echo Imported toponyms by sublayer:
SELECT sublayer_id, count(*)
FROM toponym
WHERE sublayer_id IN (3, 14)
GROUP BY sublayer_id
ORDER BY sublayer_id;
