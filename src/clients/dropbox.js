const request = require('request')
const fs = require('fs')
const config = require('config')

const listFolder = (path) => {
  return new Promise((resolve, reject) => {
    request({
      url: 'https://api.dropboxapi.com/2/files/list_folder',
      method: 'POST',
      json: true,
      headers: {
        Authorization: `Bearer ${config.dropbox.token}`
      },
      body: {
        path,
        recursive: false,
        include_media_info: false,
        include_deleted: false
      }
    }, (error, response, body) => {
      if (error) return reject(error)
      resolve(body.entries)
    })
  })
}

const downloadFile = (path, dest) => {
  return new Promise((resolve, reject) => {
    request({
      url: 'https://content.dropboxapi.com/2/files/download',
      method: 'POST',
      json: true,
      headers: {
        Authorization: `Bearer ${config.dropbox.token}`,
        'Dropbox-API-Arg': `{ 'path': '${path}' }`
      }
    })
    .on('error', err => reject(err))
    .on('response', response => resolve(response))
    .pipe(fs.createWriteStream(dest))
  })
}

const deleteFile = (path) => {
  return new Promise((resolve, reject) => {
    request({
      url: 'https://api.dropboxapi.com/2/files/delete',
      method: 'POST',
      json: true,
      headers: {
        Authorization: `Bearer ${config.dropbox.token}`
      },
      body: { path }
    }, (error, response, body) => {
      if (error) return reject(error)
      resolve(body)
    })
  })
}

module.exports = { listFolder, downloadFile, deleteFile }

