import express from 'express'

const router = express.Router()

export default (pool) => {
  router.get('/', async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''

    if (query.length < 2) {
      res.json([])
      return
    }

    try {
      const result = await pool.query(`
        WITH matches AS (
          SELECT
            'iiif_manifest' AS type,
            iiif_mask.id,
            iiif_mask.label,
            layer.label AS layer_label,
            sublayer.label AS sublayer_label,
            iiif_mask.manifest,
            ST_X(ST_Centroid(iiif_mask.geometry)) AS lon,
            ST_Y(ST_Centroid(iiif_mask.geometry)) AS lat
          FROM iiif_mask
          JOIN iiif_tileserver ON iiif_tileserver.id = iiif_mask.iiif_tileserver_id
          JOIN sublayer ON sublayer.id = iiif_tileserver.sublayer_id
          JOIN layer ON layer.label = sublayer.layer_label
          WHERE iiif_mask.label ILIKE '%' || $1 || '%'

          UNION ALL

          SELECT
            'toponym' AS type,
            toponym.id,
            toponym.text AS label,
            layer.label AS layer_label,
            sublayer.label AS sublayer_label,
            NULL::text AS manifest,
            toponym.lon,
            toponym.lat
          FROM toponym
          JOIN sublayer ON sublayer.id = toponym.sublayer_id
          JOIN layer ON layer.label = sublayer.layer_label
          WHERE toponym.text ILIKE '%' || $1 || '%'
        )
        SELECT type, id, label, layer_label, sublayer_label, manifest, lon, lat
        FROM matches
        ORDER BY label
        LIMIT 20
      `, [query])

      res.json(result.rows)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
