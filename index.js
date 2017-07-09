const http = require('http')
const express = require('express')
const fs = require('fs')

const movieFinder = require('./clients/yts')
const torrentManager = require('./torrent_manager')
const videoStreamer = require('./video_streamer')
const dropbox = require('./clients/dropbox')

const app = express()

app.get('/torrents', (req, res) => {
  res.send(torrentManager.list())
})

app.get('/library', (req, res) => {
  fs.readdir('./', (err, files) => {
    res.send(files)
  })
})

app.get('/search', async (req, res) => {
  const movies = await movieFinder.search(req.query.query)
  res.send(JSON.stringify(movies))
})

app.get('/testStream', (req, res) => {
  const url = "https://yts.ag/torrent/download/BBE2CCBB81E647039787D75BAA7A42B50F25035E"
  videoStreamer.streamFromTorrent(torrentManager, url, res)
})

app.get('/testDisk', (req, res) => {
  videoStreamer.streamFromDisk("./sample.mp4", res)
})

app.get('/testDropbox', async (req, res) => {
  await dropbox.deleteFile('/torrents/client.ovpn')
  res.end()
})

torrentManager.resume()
  .then(() => {
    app.listen(3000, () => {
      console.log('movies-manager listening on port 3000!')
    })
  })
