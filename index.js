require('dotenv').config()
var TelegramBot = require('node-telegram-bot-api')
var fs = require('fs')
var moment = require('moment')
var cron = require('node-cron')
var tkoalyevents = require('tkoalyevents')
var R = require('ramda')
var request = require('request')
const translations = require('./translations')

var GROUPS_FILE = 'groups.json'

var FOODLIST_URL = 'http://jallu.ml/unicafe/food'
const WEATHER_URL = 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20weather.forecast%20where%20woeid%20in%20(select%20woeid%20from%20geo.places(1)%20where%20text%3D%22helsinki%22)%20and%20u=%27c%27&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys'

moment.locale('fi')

if (!process.env.API_TOKEN) {
  console.error('No api token found.')
  process.exit(1)
}

var bot = new TelegramBot(process.env.API_TOKEN, {polling: true})

var groups = JSON.parse(fs.readFileSync(GROUPS_FILE))

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

cron.schedule('0 0 7 * * *', () => {
  todaysEvents()
  weather()
})

cron.schedule('0 0 10 * * 1-5', todaysFood)

bot.on('message', function (msg) {
  if (msg.chat.type !== 'private' && groups.indexOf(msg.chat.id) === -1) {
    console.log('Found a new group:', msg.chat.id, msg.chat.title)
    groups.push(msg.chat.id)
    fs.writeFile(GROUPS_FILE, JSON.stringify(groups))
  }
})
