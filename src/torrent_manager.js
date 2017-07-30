const WebTorrent = require('webtorrent')
const config = require('config')
const fs = require('fs')
const shulz = require('shulz')
const validUrl = require('valid-url')
const magnet = require('magnet-uri')
const rimraf = require('rimraf')
const path = require('path')
const { findLargestFile } = require('./utils')

const webTorrentClient = new WebTorrent()
const inProgressMap = shulz.open('./.in-progress')

process.on('exit', () => {
  inProgressMap.close()
})

webTorrentClient.on('error', function (err) {
  console.log(err)
})

const torrents = {}
const tmpTorrents = {}
const tmpCleanerInterval = 3600000

const startTmpCleaner = () => {
  setInterval(() => {
    fs.readdir(config.webtorrent.paths.tmp, (err, files) => {
      if (err) throw err
      files.forEach(file => {
        const stat = fs.statSync(path.join(config.webtorrent.paths.tmp, file))

        const hrTime = process.hrtime()
        const now = (hrTime[0] * 1000000) + (hrTime[1] / 1000)

        if (now - stat.atime >= config.webtorrent.tmp_ttl) {
          rimraf(file, () => {})
        }
      })
    })
  }, tmpCleanerInterval)
}

const startTorrentsWatcher = () => {
  if (!config.webtorrent.paths.watch) return

  fs.watch(config.webtorrent.paths.watch, (eventType, filename) => {
    if (eventType === 'change' && filename.endsWith('.torrent')) {
      download(filename)
    }
  })
}

const removeTmpTorrent = (magnetOrTorrent, infoHash) => {
  return new Promise((resolve, reject) => {
    webTorrentClient.remove(infoHash, (err) => {
      if (err) return reject(err)
      delete tmpTorrents[magnetOrTorrent]
      resolve()
    })
  })
}

const download = (magnetOrTorrent) => {
  return new Promise(async (resolve, reject) => {
    const path = config.webtorrent.paths.download

    if (torrents[magnetOrTorrent]) return reject('Torrent already downloading.')

    if (tmpTorrents[magnetOrTorrent]) {
      try {
        await removeTmpTorrent(magnetOrTorrent, tmpTorrents[magnetOrTorrent].infoHash)
      } catch (err) {
        return reject('Error removing temporary torrent:', err)
      }
    }

    if (!magnetOrTorrent || (!validUrl.isUri(magnetOrTorrent) && !magnet.decode(magnetOrTorrent).infoHash)) {
      return reject('Invalid torrent URL or magnetURI.')
    }

    torrents[magnetOrTorrent] = true

    webTorrentClient.add(magnetOrTorrent, { path }, (torrent) => {
      inProgressMap.set(`in-progress.${magnetOrTorrent}`, magnetOrTorrent)
      torrents[magnetOrTorrent] = torrent

      torrent.on('done', () => {
        delete torrents[magnetOrTorrent]
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

    const path = config.webtorrent.paths.tmp
    tmpTorrents[magnetOrTorrent] = true

    webTorrentClient.add(magnetOrTorrent, { path }, (torrent) => {
      tmpTorrents[magnetOrTorrent] = torrent

      torrent.on('done', () => {
        delete tmpTorrents[magnetOrTorrent]
        torrent.emit('completed')
      })

      resolve(torrent)
    })
  })
}

const resume = () => {
  const inProgress = shulz.read('./.in-progress')
  // No torrents in progress.
  if (!Object.keys(inProgress).length) {
    return new Promise((resolve, reject) => resolve())
  }

  const promises = Object.values(inProgress)
    .map((magnetOrTorrent) => download(magnetOrTorrent))

  return Promise.all(promises)
    .then(() => {
      startTmpCleaner()
      startTorrentsWatcher()
    })
}

const getFileFromTorrent = (magnetOrTorrent) => {
  const torrent = torrents[magnetOrTorrent] || tmpTorrents[magnetOrTorrent]

  if (torrent) {
    const file = findLargestFile(torrent.files)
    return Promise.resolve({ file, fullPath: torrent.path + '/' + file.path });
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
}))

const downloaded = () => {
  const folders = fs.readdirSync(config.webtorrent.paths.download)
  const files = folders.map(folder => {
    const filepath = config.webtorrent.paths.download + '/' + folder

    if (folder.endsWith('.mp4')) {
      return {
        name: folder,
        path: filepath,
        poster: poster: `/images/${folder}.jpg`
      }
    }

    if (!fs.lstatSync(filepath).isDirectory()) {
      return
    }

    const files = fs.readdirSync(config.webtorrent.paths.download + '/' + folder)

    const file = files.find(file => file.endsWith('.mp4'))

    if (file) {
      return {
        path: config.webtorrent.paths.download + '/' + folder + '/' + file,
        name: folder,
        poster: `/images/${file}.jpg`
      }
    }
  })

  return files.filter(file => file)
}

module.exports = { resume, download, downloadTmp, downloaded, downloading, getFileFromTorrent, removeTmpTorrent }
