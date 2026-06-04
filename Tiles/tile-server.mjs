import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(__dirname)
const port = Number(process.env.PORT ?? 8080)
const host = process.env.HOST ?? 'localhost'
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173'

const emptyGif = Buffer.from(
  'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64'
)

const contentTypes = new Map([
  ['.gif', 'image/gif'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp']
])

function sendHeaders(res, statusCode, contentType) {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Type': contentType
  })
}

function isReducedCadastreTile(pathname) {
  return /^\/Gereduceerd_Kadaster_tiles\/\d+\/\d+\/\d+\.png$/.test(pathname)
}

function getSafeFilePath(pathname) {
  const decodedPath = decodeURIComponent(pathname)
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, '')
  const filePath = resolve(join(root, normalizedPath))

  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    return null
  }

  return filePath
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400)
    res.end('Bad request')
    return
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
  const filePath = getSafeFilePath(pathname)

  if (!filePath) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    if (isReducedCadastreTile(pathname)) {
      sendHeaders(res, 200, 'image/gif')
      res.end(emptyGif)
      return
    }

    res.writeHead(404)
    res.end('Not found')
    return
  }

  const contentType = contentTypes.get(extname(filePath).toLowerCase()) ?? 'application/octet-stream'
  sendHeaders(res, 200, contentType)
  createReadStream(filePath).pipe(res)
})

server.listen(port, host, () => {
  console.log(`Tile server running at http://${host}:${port}`)
})
