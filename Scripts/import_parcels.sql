\set ON_ERROR_STOP on

\if :{?data_root}
\else
  \set data_root .
\endif
\cd :'data_root'

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TEMP TABLE import_parcel_raw (
  feature jsonb NOT NULL
) ON COMMIT DROP;

\echo Loading Primitief Kadaster parcels from Parcels/CLEAN/primitief_kadaster.geojson
\copy import_parcel_raw(feature) FROM PROGRAM 'jq -r ''.features[] | [(. | tostring)] | @tsv'' Parcels/CLEAN/primitief_kadaster.geojson'

DELETE FROM parcel
WHERE sublayer_id = 10;

INSERT INTO parcel (sublayer_id, text, geometry)
SELECT
  10 AS sublayer_id,
  feature #>> '{properties,text}' AS text,
  ST_SetSRID(ST_GeomFromGeoJSON(feature -> 'geometry'), 4326) AS geometry
FROM import_parcel_raw;

COMMIT;

\echo Imported parcels by sublayer:
SELECT sublayer_id, count(*)
FROM parcel
WHERE sublayer_id = 10
GROUP BY sublayer_id
ORDER BY sublayer_id;
