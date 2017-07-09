const fs = require('fs')
const { findLargestFile } = require('./utils');

const streamFromDisk = (path, response) => {
  const stats = fs.statSync(path);
  const total = stats.size;

  response.writeHead(200, {
    'Accept-Ranges': 'bytes',
    'Transfer-Encoding':' chunked',
    'Content-Length': total,
    'Content-Type': 'video/mp4'
  });

  let stream = fs.createReadStream(path)
    .on('open', () => stream.pipe(response))
    .on('error', err => response.end(err))

  response.on('close', () => {
    stream.destroy()
    stream = null
  })
}

const streamFromTorrent = (torrentManager, magnetOrTorrent, response) => {
  torrentManager.createStreamFrom(magnetOrTorrent)
    .then(stream => {
      response.writeHead(200, {
        'Accept-Ranges': 'bytes',
        'Transfer-Encoding':' chunked',
        'Content-Type': 'video/mp4'
      });

      stream.pipe(response)

      response.on('close', () => stream.destroy())
    })
}

module.exports = { streamFromTorrent, streamFromDisk }