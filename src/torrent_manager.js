const WebTorrent = require('webtorrent')
const config = require('config')
const fs = require('fs')
const { findLargestFile } = require('./utils')
const webTorrentClient = new WebTorrent()
const redis = require('redis').createClient()
const validUrl = require('valid-url')
const magnet = require('magnet-uri')

webTorrentClient.on('error', function (err) {
  console.log(err)
});

const torrents = {}
const tmpTorrents = {}
const tmpCleanerInterval = 150000;

const startWatching = () => {
  if (!config.webtorrent.paths.watch) return;

  fs.watch(config.webtorrent.paths.watch, (eventType, filename) => {
    if (eventType === 'change' && filename.endsWith('.torrent')) {
      download(filename)
    }
  })
}

const download = (magnetOrTorrent) => {
  return new Promise((resolve, reject) => {
    const path = config.webtorrent.paths.download

    if (torrents[magnetOrTorrent]) return reject('Torrent already downloading.')

    if (!magnetOrTorrent || (!validUrl.isUri(magnetOrTorrent) && !magnet.decode(magnetOrTorrent).infoHash)) {
      return reject('Invalid torrent URL or magnetURI.')
    }

    torrents[magnetOrTorrent] = true

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

const downloadTmp = (magnetOrTorrent) => {
  return new Promise((resolve, reject) => {

    if (!magnetOrTorrent || (!validUrl.isUri(magnetOrTorrent) && !magnet.decode(magnetOrTorrent).infoHash)) {
      return reject('Invalid torrent URL or magnetURI.')
    }

    tmpTorrents[magnetOrTorrent] = true

    webTorrentClient.add(magnetOrTorrent, (torrent) => {
      tmpTorrents[magnetOrTorrent] = torrent

      torrent.on('done', () => {
        torrents[magnetOrTorrent] = null
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

      const promises = magnetsOrTorrents.map((magnetOrTorrent) =>
        download(magnetOrTorrent)
      )

      Promise.all(promises).then(startWatching).then(resolve)
    })
  })
}


const getFileFromTorrent = (magnetOrTorrent) => {
  const torrent = torrents[magnetOrTorrent] || tmpTorrents[magnetOrTorrent]

  if (torrent) {
    const file = findLargestFile(torrent.files)
    if (!file.path.startsWith('/tmp/')) file.path = torrent.path + '/' + file.path
    return Promise.resolve(file);
  }

  return downloadTmp(magnetOrTorrent)
    .then(() => getFileFromTorrent(magnetOrTorrent))
}

const downloading = () => Object.values(torrents).map(torrent => ({
    hash: torrent.infoHash,
    magnetURI: torrent.magnetURI,
    name: torrent.info ? torrent.info.name.toString('UTF-8') : 'undefined',
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

const downloaded = () => {
  const folders = fs.readdirSync(config.webtorrent.paths.download)
  const files = folders.map(folder => {
    if (folder.endsWith('.mp4')) {
      const filepath = config.webtorrent.paths.download + '/' + folder
      return { name: folder, path: filepath }
    }

    const files = fs.readdirSync(config.webtorrent.paths.download + '/' + folder)

    const file = files.find(file => file.endsWith('.mp4'))

    if (file) {
      return {
        path: config.webtorrent.paths.download + '/' + folder + '/' + file,
        name: folder
      }
    }
  })

  return files
}

module.exports = { resume, download, downloadTmp, downloaded, downloading, getFileFromTorrent }
