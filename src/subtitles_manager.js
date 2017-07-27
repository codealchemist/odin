const subdb = require('./clients/subdb')
const opensubtitles = require('./clients/opensubtitles')
const config = require('config')
const path = require('path')
const fs = require('fs')

const fetchSubtitles = (moviePath) => {
  const dirname = path.dirname(moviePath)

  const subs = fs.readdirSync(dirname)
      .filter(file => file.endsWith('.srt'))
      .map(file => `${dirname}/${file}`)

  if (subs.length > 0) return Promise.resolve(subs);

  let promise;

  if (config.opensubtitles.username && config.opensubtitles.password && config.opensubtitles.useragent){
    return opensubtitles.downloadSubtitles(moviePath).catch(() => subdb.downloadSubtitles(moviePath))
  } else {
    return subdb.downloadSubtitles(moviePath)
  }
}

module.exports = { fetchSubtitles }