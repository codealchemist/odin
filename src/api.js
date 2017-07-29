const express = require('express')
const bodyParser = require('body-parser')
const config = require('config')
const querystring = require('querystring')
const fs = require('fs')
const srt2vtt = require('srt-to-vtt')

const movieFinder = require('./clients/yts')
const subtitlesManager = require('./subtitles_manager')
const torrentManager = require('./torrent_manager')
const videoStreamer = require('./video_streamer')
const { findLargestFile, generateHtmlPlayerWithSubs, TORRENT_PLAYER, DISK_PLAYER } = require('./utils')

const app = express()
/*
*       MIDDLEWARES
*/
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
  next();
});

/*
*       API
*/
app.get('/settings', (req, res) => res.json(config))

app.get('/torrents', (req, res) => res.json(torrentManager.downloading()))

app.get('/library', (req, res) => res.json(torrentManager.downloaded()))

app.get('/search', (req, res) => {
  movieFinder.search(req.query.query).then(movies => res.send(JSON.stringify(movies)))
})

app.get('/torrentStream', (req, res) => {
  const url = req.query.url
  videoStreamer.streamFromTorrent(torrentManager, url, req, res)
})

app.get('/diskStream', (req, res) => {
  const path = req.query.path
  videoStreamer.streamFromDisk(path, req, res)
})

app.get('/subtitlesStream', (req, res) => {
  fs.createReadStream(req.query.path)
    .pipe(srt2vtt())
    .pipe(res)
})

app.put('/download', (req, res) => {
  torrentManager.download(req.body.url)
    .then(torrent => {
      torrent.on('completed', () => {
        const file = findLargestFile(torrent.files)
        subtitlesManager
          .fetchSubtitles(torrent.path + '/' + file.path)
          .catch((err) => {
            console.log('Couldn\'t download any sub:', err)
          })
      })

      res.end('OK')
    })
    .catch(err => res.status(500).send(err))
})

app.get('/diskPlayer', (req, res) => {
  const params = querystring.stringify({ path: req.query.path })

  generateHtmlPlayerWithSubs(DISK_PLAYER, req.query.path, params)
    .then(html => res.send(html))
    .catch(err => res.status(500).send(err))
})

app.get('/torrentPlayer', (req, res) => {
  const params = querystring.stringify({ url: req.query.url })

  torrentManager.getFileFromTorrent(req.query.url)
    .then(({ file, fullPath }) => generateHtmlPlayerWithSubs(TORRENT_PLAYER, fullPath, params))
    .then(html => res.send(html))
    .catch(err => res.status(500).send(err))
})

module.exports = app;
