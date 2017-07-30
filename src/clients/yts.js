const request = require('request')

const search = (queryTerm) => {
  return new Promise((resolve, reject) => {
    request({
      url: 'https://yts.ag/api/v2/list_movies.json',
      method: 'GET',
      json: true,
      qs: { query_term: queryTerm }
    }, (error, response, body) => {
      if (error) return reject(error)
      resolve(body.data.movies)
    })
  })
}

module.exports = { search }
