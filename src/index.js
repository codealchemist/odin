#!/usr/bin/env node
const torrentManager = require('./torrent_manager')
const api = require('./api')
const config = require('config')

torrentManager.resume().then(() => {
  api.listen(config.api.port, () => console.log('odin listening to you on port 3000!'))
})
