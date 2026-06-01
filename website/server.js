const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const express = require('express')
const path = require('path')
const cors = require('cors')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = express()

  // Add CORS middleware
  server.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true,
  }))

  // Serve static assets from the parent directory and website public folder
  server.use('/assets', express.static(path.join(__dirname, '../assets')))
  server.use('/favicon.ico', express.static(path.join(__dirname, 'public/favicon.ico')))

  server.all('*', (req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
