#!/usr/bin/env node
const torrentManager = require('./torrent_manager')
const dropbox = require('./clients/dropbox')
const api = require('./api')
const config = require('config')

if (config.dropbox.token && config.dropbox.torrentsPath) {
  setInterval(() => {
    dropbox.listFolder(config.dropbox.torrentsPath).then(files => {
      const torrentFiles = files.filter(file => file.endsWith('.torrent'))

      torrentFiles.forEach((file) => {
        const fullPath = `${config.dropbox.torrentsPath}/${file}`

        torrentFiles
          .downloadFile(fullPath, config.webtorrent.paths.watch)
          .then(() => dropbox.deleteFile(fullPath))
      })
    })
  }, config.dropbox.watch_interval)
}

torrentManager.resume()
  .then(() => {
    api.listen(config.api.port, () => console.log('odin listening to you on port 3000!'))
  })
