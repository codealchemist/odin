const express = require('express')

const movieFinder = require('./clients/yts')
const torrentManager = require('./torrent_manager')
const streamer = require('./streamer')
const dropbox = require('./clients/dropbox')

const app = express()

app.get('/torrents', (req, res) => {
  res.send(torrentManager.downloading())
})

app.get('/library', (req, res) => {
  torrentManager.downloaded().then(files => res.send(JSON.stringify(files)));
})

app.get('/search', (req, res) => {
  movieFinder.search(req.query.query).then(movies => res.send(JSON.stringify(movies)))
})

app.get('/testStream', (req, res) => {
  const url = "https://yts.ag/torrent/download/A02AA4059C39665F55099DD56EEEBEAE111C3D8E"
  streamer.streamFromTorrent(torrentManager, url, req, res)
})

app.get('/testDisk', (req, res) => {
  const path = "/Users/scarullo/Development/movie-manager/tmp/ghost/Ghost.In.The.Shell.2017.720p.BluRay.x264-[YTS.AG].mp4"
  streamer.streamFromDisk(path, res)
})

app.get('/testDropbox', async (req, res) => {
  await dropbox.deleteFile('/torrents/client.ovpn')
  res.end()
})

app.get('/diskPlayer', (req, res) => {
  res.send(`
    <video controls>
      <source src="/testDisk" type="video/mp4">
    </video>
  `)
})

app.get('/torrentPlayer', (req, res) => {
  res.send(`
    <video controls>
      <source src="/testStream" type="video/mp4">
    </video>
  `)
})

module.exports = app;
