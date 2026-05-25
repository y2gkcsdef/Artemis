import express from 'express'
import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import layersRouter from './routes/layers.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(cors({
  origin: 'http://localhost:5173'
}))

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

// Static tiles
app.use('/tiles', express.static(path.join(__dirname, '../../../tiles')))

// Routes
app.use('/api/layers', layersRouter(pool))

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', db: 'connected' })
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message })
  }
})

app.listen(3000, () => console.log('Server running on port 3000'))