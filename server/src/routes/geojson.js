import express from 'express'

const datasets = {
  parcel: {
    featureQuery: `
      SELECT json_build_object(
        'type', 'Feature',
        'id', id,
        'geometry', ST_AsGeoJSON(geometry)::json,
        'properties', json_build_object(
          'id', id,
          'sublayer_id', sublayer_id,
          'text', text
        )
      ) AS feature
      FROM parcel
      WHERE sublayer_id = $1
        AND geometry IS NOT NULL
    `
  },
  'iiif-mask': {
    featureQuery: `
      SELECT json_build_object(
        'type', 'Feature',
        'id', iiif_mask.id,
        'geometry', ST_AsGeoJSON(iiif_mask.geometry)::json,
        'properties', json_build_object(
          'id', iiif_mask.id,
          'iiif_tileserver_id', iiif_mask.iiif_tileserver_id,
          'sublayer_id', iiif_tileserver.sublayer_id,
          'manifest', iiif_mask.manifest,
          'label', iiif_mask.label,
          'sprite_x', iiif_mask.sprite_x,
          'sprite_y', iiif_mask.sprite_y,
          'sprite_width', iiif_mask.sprite_width,
          'sprite_height', iiif_mask.sprite_height
        )
      ) AS feature
      FROM iiif_mask
      JOIN iiif_tileserver ON iiif_tileserver.id = iiif_mask.iiif_tileserver_id
      WHERE iiif_tileserver.sublayer_id = $1
        AND iiif_mask.geometry IS NOT NULL
    `
  }
}

function featureCollectionQuery(featureQuery) {
  return `
    SELECT json_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(json_agg(feature), '[]'::json)
    ) AS geojson
    FROM (
      ${featureQuery}
    ) features
  `
}

export default (pool) => {
  const router = express.Router()

  router.get('/:dataset/:sublayerId', async (req, res) => {
    const dataset = datasets[req.params.dataset]
    const sublayerId = Number(req.params.sublayerId)

    if (!dataset) {
      res.status(404).json({
        error: 'GeoJSON dataset not found',
        dataset: req.params.dataset
      })
      return
    }

    if (!Number.isInteger(sublayerId)) {
      res.status(400).json({ error: 'Sublayer id must be an integer' })
      return
    }

    try {
      const result = await pool.query(featureCollectionQuery(dataset.featureQuery), [sublayerId])
      res.json(result.rows[0].geojson)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
