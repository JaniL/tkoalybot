var TelegramBot = require('node-telegram-bot-api');
var ical = require('ical')
var request = require('request')

var ICS_URL = 'http://ics.tko-aly.fi/'

var bot = new TelegramBot(process.env.API_TOKEN, {polling: true})

function makeHumanReadable(e) {
  return new Date(e.start).toDateString() + ": [" + e.summary.trim() + "](" + e.url + ")"
}

function retrieveEvents(cb) {
  request(ICS_URL, function(err, res) {
    var data = ical.parseICS(res.body)

    data = Object.keys(data).map(function(k) {
      return data[k]
    }).filter(function(e) {
      return e.type === 'VEVENT'
    })

    cb(data)
  })
}

bot.onText(/\/events$/, function (msg, match) {
  var fromId = msg.from.id;
  retrieveEvents(function(data) {
    data = data.slice(0,3).map(makeHumanReadable)

    var res = '*Tulevat tapahtumat:* \n'
    for (var i = 0; i < data.length; i++) {
      var event = data[i]
      res += event + '\n'
    }

    bot.sendMessage(fromId, res.trim(), {
      disable_web_page_preview: true,
      parse_mode: 'Markdown'
    })
  })
});
