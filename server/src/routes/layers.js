import express from 'express'

const router = express.Router()

export default (pool) => {

  // All layers
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT label, start_year, end_year
        FROM layer
        ORDER BY start_year
      `)
      res.json(result.rows)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // Timeline range
  router.get('/range', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT MIN(start_year) - 30 AS range_start, MAX(end_year) + 30 AS range_end
        FROM layer
      `)
      res.json(result.rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // Sublayers for a specific layer
  router.get('/:label/sublayers', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT id, label, type, source, default_visibility, sort_order
        FROM sublayer
        WHERE layer_label = $1
        ORDER BY sort_order
      `, [req.params.label])
      res.json(result.rows)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}