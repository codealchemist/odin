const WebTorrent = require('webtorrent')
const config = require('config')
const { findLargestFile } = require('./utils')

const webTorrentClient = new WebTorrent()
const redis = require('redis').createClient()
const path = config.paths.download

const torrents = {}

const download = (magnetOrTorrent) => {
  return new Promise((resolve, reject) => {
    webTorrentClient.add(magnetOrTorrent, { path }, (torrent) => {
      redis.sadd('in-progress', magnetOrTorrent)
      torrents[magnetOrTorrent] = torrent

      torrent.on('done', () => {
        torrents[magnetOrTorrent] = null
        redis.srem('in-progress', magnetOrTorrent)
        torrent.emit('completed')
      })

      resolve(torrent)
    })
  })
}

const resume = () => {
  return new Promise((resolve, reject) => {
    redis.smembers('in-progress', (err, magnetsOrTorrents) => {
      if (err) return reject()
      const promises = magnetsOrTorrents.map((magnetOrTorrent) => download(magnetOrTorrent))
      resolve(Promise.all(promises))
    })
  })
}

const createStreamFrom = (magnetOrTorrent) => {
  let streamPromise;
  const torrent = torrents[magnetOrTorrent]

  if (torrent) {
    const file = findLargestFile(torrent.files)
    stream = file.createReadStream()
    streamPromise = Promise.resolve(stream)
  } else {
    streamPromise = download(magnetOrTorrent)
      .then((torrent) => {
        const file = findLargestFile(torrent.files)
        if (!file) return Promise.reject();
        return file.createReadStream();
      })
  }

  return streamPromise
}

const list = () => Object.values(torrents).map(torrent => ({
    hash: torrent.infoHash,
    name: torrent.info.name.toString('UTF-8'),
    timeRemaining: torrent.timeRemaining,
    received: torrent.received,
    downloaded: torrent.downloaded,
    uploaded: torrent.uploaded,
    downloadSpeed: torrent.downloadSpeed,
    uploadSpeed: torrent.uploadSpeed,
    progress: torrent.progress,
    ratio: torrent.ratio,
    numPeers: torrent.numPeers,
    path: torrent.path
  })
)

module.exports = { resume, download, list, createStreamFrom }
