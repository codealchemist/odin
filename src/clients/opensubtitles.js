const https = require('https')
const fs = require('fs')
const path = require('path')
const OS = require('opensubtitles-api')
const config = require('config')

const OpenSubtitles = new OS({
  useragent: config.opensubtitles.useragent,
  username: config.opensubtitles.username,
  password: config.opensubtitles.password,
  ssl: true
});

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = https.get(url, (response) => {
      response.pipe(file)
      file.on('finish', function() {
        file.close()
        resolve(dest)
      });
    });
  })
}

const downloadSubtitles = (moviePath) => {
  const filename = path.basename(moviePath)

  return OpenSubtitles.login()
    .then(() =>
      OpenSubtitles
        .search({ sublanguageid: config.opensubtitles.langs.join(','), filename })
        .then(subtitles => {
          const promises = Object.keys(subtitles).map(lang => {
            return downloadFile(subtitles[lang].url, moviePath.replace(/mp4$/, `${lang}.srt`))
          })

          return Promise.all(promises)
        })
        .catch(err => {
          console.log('Error with OpenSubtitles.org:', err);
        })
    )
}


module.exports = { downloadSubtitles }