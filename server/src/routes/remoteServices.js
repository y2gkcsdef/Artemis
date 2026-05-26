import express from 'express'

const router = express.Router()

export default (pool) => {
  router.get('/:sublayerId', async (req, res) => {
    const sublayerId = Number(req.params.sublayerId)

    if (!Number.isInteger(sublayerId)) {
      res.status(400).json({ error: 'Sublayer id must be an integer' })
      return
    }

    try {
      const result = await pool.query(`
        SELECT id, sublayer_id, type, endpoint
        FROM remote_service
        WHERE sublayer_id = $1
      `, [sublayerId])

      if (result.rowCount === 0) {
        res.status(404).json({
          error: 'Remote service not found',
          sublayer_id: sublayerId
        })
        return
      }

      res.json(result.rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
