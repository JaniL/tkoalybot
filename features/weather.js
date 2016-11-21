var cron = require('node-cron')
var request = require('request')
var moment = require('moment')
const translations = require('./utils/translations')

const WEATHER_URL = 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20weather.forecast%20where%20woeid%20in%20(select%20woeid%20from%20geo.places(1)%20where%20text%3D%22helsinki%22)%20and%20u=%27c%27&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys'

function weather() {
  request.get(WEATHER_URL, (err, res, body) => {
    if (err) return
    var obj = JSON.parse(body).query.results.channel

    var resStr = `*Lämpötila on Helsingissä ${obj.item.condition.temp}°C,  ${translations.conditions[obj.item.condition.code]} ${translations.emoji[obj.item.condition.code]} . `
    resStr += `Aurinko nousee ${moment(obj.astronomy.sunrise, ["h:mm A"]).format('HH:mm')} ja laskee ${moment(obj.astronomy.sunset, ["h:mm A"]).format('HH:mm')}.*`

    for (var g of groups) {
      bot.sendMessage(g, resStr.trim(), {
        parse_mode: 'Markdown'
      })
    }
  })
}

module.exports = (bot) => {
  cron.schedule('0 0 7 * * *', () => {
    weather()
  })
}
