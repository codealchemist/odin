const https = require('https')
const fs = require('fs')
const path = require('path')
const OS = require('opensubtitles-api')
const config = require('config')
const { downloadFile } = require('../utils')

const OpenSubtitles = new OS({
  useragent: config.opensubtitles.useragent,
  username: config.opensubtitles.username,
  password: config.opensubtitles.password,
  ssl: true
});

const downloadSubtitles = (moviePath) => {
  const filename = path.basename(moviePath)

  return OpenSubtitles.login()
    .then(() =>
      OpenSubtitles
        .search({ sublanguageid: config.opensubtitles.langs.join(','), filename })
        .then(subtitles => {
          const promises = Object.keys(subtitles).map(lang => {
            return downloadFile(true, subtitles[lang].url, moviePath.replace(/mp4$/, `${lang}.srt`))
          })

          return Promise.all(promises)
        })
        .catch(err => {
          console.log('Error with OpenSubtitles.org:', err);
        })
    )
}


module.exports = { downloadSubtitles }