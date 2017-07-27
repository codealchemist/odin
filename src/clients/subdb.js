const config = require('config')
const SubDb = require('subdb')

const subdb = new SubDb()

const downloadSubtitles = (path) => {
  return new Promise((resolve, reject) => {
    subdb.computeHash(path, (err, res) => {
      if (err) return reject(err);

      const hash = res;
      subdb.api.search_subtitles(hash, (err, res) => {
        if(err) return reject(err);

        const promises = res.map((lang) => {
          return new Promise((res, rej) => {
            const subFile = path.replace(/mp4$/, `${lang}.srt`)
            subdb.api.download_subtitle(hash, lang, subFile, (err, res) => {
              if (err) return reject(err);
              resolve(subFile);
            });
          });
        });

        Promise.all(promises).then((subFiles) => resolve(subFiles))
      });
    });
  })
}

module.exports = { downloadSubtitles }