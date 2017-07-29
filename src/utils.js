const subtitlesManager = require('./subtitles_manager')
const querystring = require('querystring')
const config = require('config')
const https = require('https')
const http = require('http')
const fs = require('fs')

const findLargestFile = (files) => {
  let max = 0;
  let largestFile;

  files.forEach(file => { if (file.length > max) largestFile = file })

  return largestFile;
}

const generateHtmlPlayerWithSubs = (type, path, params) => {
  return subtitlesManager.fetchSubtitles(path)
    .catch((err) => {
      console.log('Couldn\'t download any sub:', err)
      return Promise.resolve([]); // Just to continue
    })
    .then((subFiles) => {
      const subs = subFiles.map(file => {
        const matches = file.match(/(\S{2})\.srt$/)
        const params = querystring.stringify({ path: file })
        return `<track src="http://${config.api.host}:${config.api.port}/subtitlesStream?${params}" kind="subtitles" srclang="${matches[1]}" />`
      })

      return `
        <video class="player" crossorigin="anonymous" controls>
          <source src="http://${config.api.host}:${config.api.port}/${type}Stream?${params}" type="video/mp4">
          ${subs.join('')}
        </video>
      `
    })
}

const downloadFile = (ssl, url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (ssl ? https : http).get(url, (response) => {
      response.pipe(file)
      file.on('finish', function() {
        file.close()
        resolve(dest)
      });
    });
  })
}

const TORRENT_PLAYER = 'torrent'
const DISK_PLAYER = 'disk'

module.exports = { findLargestFile, generateHtmlPlayerWithSubs, TORRENT_PLAYER, DISK_PLAYER }