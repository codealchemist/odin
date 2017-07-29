const fs = require('fs')
const { findLargestFile } = require('./utils');

const streamFromDisk = (path, request, response) => {
  const stats = fs.statSync(path);
  const range = request.headers.range;
  const total = stats.size;
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

  let stream = fs.createReadStream(path, { start, end })
    .on('open', () => stream.pipe(response))
    .on('error', err => response.end(err))

  response.on('close', () => {
    stream.destroy()
    stream = null
  })
}

const streamFromTorrent = (torrentManager, magnetOrTorrent, request, response) => {
  torrentManager.getFileFromTorrent(magnetOrTorrent)
    .then(({ file, fullPath }) => {
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

      let stream = file.createReadStream({ start, end })

      stream.pipe(response)

      response.on('close', () => {
        stream.destroy()
        stream = null
      })
    })
}

module.exports = { streamFromTorrent, streamFromDisk }