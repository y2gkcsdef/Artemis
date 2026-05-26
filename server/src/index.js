import express from 'express'
import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import layersRouter from './routes/layers.js'
import remoteServicesRouter from './routes/remoteServices.js'
import sublayersRouter from './routes/sublayers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const requiredEnv = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
const missingEnv = requiredEnv.filter((key) => !process.env[key])

if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`)
}

const app = express()

app.use(cors({
  origin: 'http://localhost:5173'
}))

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

// Static tiles
app.use('/tiles', express.static(path.join(__dirname, '../../../tiles')))

// Routes
app.use('/api/layers', layersRouter(pool))
app.use('/api/remote-services', remoteServicesRouter(pool))
app.use('/api/sublayers', sublayersRouter(pool))

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
