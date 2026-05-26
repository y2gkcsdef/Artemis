import express from 'express'
import { resolveSublayerType } from '../sublayerTypes.js'

const router = express.Router()

export default (pool) => {
  router.get('/resolve/:id', async (req, res) => {
    const sublayerId = Number(req.params.id)

    if (!Number.isInteger(sublayerId)) {
      res.status(400).json({ error: 'Sublayer id must be an integer' })
      return
    }

    try {
      const result = await pool.query(`
        SELECT id, type
        FROM sublayer
        WHERE id = $1
      `, [sublayerId])

      if (result.rowCount === 0) {
        res.status(404).json({
          error: 'Sublayer not found',
          id: sublayerId
        })
        return
      }

      const sublayer = result.rows[0]
      const table = resolveSublayerType(sublayer.type)

      if (!table) {
        res.status(404).json({
          error: 'Unknown sublayer type',
          id: sublayer.id,
          type: sublayer.type
        })
        return
      }

      res.json({
        id: sublayer.id,
        type: sublayer.type,
        table
      })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
