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

const streamFromTorrent = (torrentManager, magnetOrTorrent, request, response) => {
  torrentManager.getFileFromTorrent(magnetOrTorrent)
    .then((file) => {
      const range = request.headers.range;
      const total = file.length;
      const parts = range.replace(/bytes=/, '').split('-');
      const partialstart = parts[0];
      const partialend = parts[1];

      const start = parseInt(partialstart, 10);
      const end = partialend ? parseInt(partialend, 10) : total;
      const chunksize = (end - start);

      response.writeHead(206, {
        'Content-Range': `bytes ${start}-${end - 1}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4'
      })

      const stream = file.createReadStream({ start, end })

      stream.pipe(response)

      response.on('close', () => stream.destroy())
    })
}

module.exports = { streamFromTorrent, streamFromDisk }