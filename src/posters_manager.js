const config = require('config')
const GoogleImages = require('google-images');

const client = new GoogleImages(config.google_cse.cse_id, config.google_cse.api_key);

const searchPoster = (movieName) => {
  return client.search(`${movieName} movie poster`)
    .then((images) => image[0].url)
}

module.exports = { searchPoster }