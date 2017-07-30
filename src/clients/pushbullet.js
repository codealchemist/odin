const request = require('request')
const config = require('config')

const notifyPushBullet = (title, body) => {
  return new Promise((resolve, reject) => {
    request({
      url: 'https://api.pushbullet.com/v2/pushes',
      method: 'POST',
      json: true,
      headers: {
        'Access-Token': config.pushbullet.token
      },
      body: { body, title, type: 'note' }
    }, (error, response, body) => {
      if (error) return reject(error)
      resolve(body)
    })
  })
}

module.exports = { notifyPushBullet }
