const WebTorrent = require('webtorrent')
const config = require('config')
const fs = require('fs')
const { findLargestFile } = require('./utils')
const webTorrentClient = new WebTorrent()
const shulz = require('shulz')
const validUrl = require('valid-url')
const magnet = require('magnet-uri')

const inProgressMap = shulz.open('./.in-progress');

process.on('exit', () => {
  inProgressMap.close()
})

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
      inProgressMap.set(`in-progress.${magnetOrTorrent}`, magnetOrTorrent)
      torrents[magnetOrTorrent] = torrent

      torrent.on('done', () => {
        torrents[magnetOrTorrent] = null
        inProgressMap.clear(`in-progress.${magnetOrTorrent}`)
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
  const inProgress = shulz.read('./.in-progress');
  const promises = Object.values(inProgress)
    .map((magnetOrTorrent) => download(magnetOrTorrent))

  return Promise.all(promises).then(startWatching)
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
    const filepath = config.webtorrent.paths.download + '/' + folder

    if (folder.endsWith('.mp4')) {
      return { name: folder, path: filepath }
    }

    if (!fs.lstatSync(filepath).isDirectory()) {
      return;
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

  return files.filter(file => file)
}

module.exports = { resume, download, downloadTmp, downloaded, downloading, getFileFromTorrent }
