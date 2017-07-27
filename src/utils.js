const subtitlesManager = require('./subtitles_manager')
const querystring = require('querystring')

const findLargestFile = (files) => {
  let max = 0;
  let largestFile;

  files.forEach(file => { if (file.length > max) largestFile = file })

  return largestFile;
}

const generateHtmlPlayerWithSubs = (type, path, params) => {
  return subtitlesManager.fetchSubtitles(path)
    .then((subFiles) => {
      const subs = subFiles.map(file => {
        const matches = file.match(/(\S{2})\.srt$/)
        const params = querystring.stringify({ path: file })
        return `<track src="http://localhost:3000/subtitlesStream?${params}" kind="subtitles" srclang="${matches[1]}" />`
      })

      return `
        <video class="player" crossorigin="anonymous" controls>
          <source src="http://localhost:3000/${type}Stream?${params}" type="video/mp4">
          ${subs.join('')}
        </video>
      `
    })
}

const TORRENT_PLAYER = 'torrent'
const DISK_PLAYER = 'disk'

module.exports = { findLargestFile, generateHtmlPlayerWithSubs, TORRENT_PLAYER, DISK_PLAYER }