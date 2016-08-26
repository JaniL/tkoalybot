var TelegramBot = require('node-telegram-bot-api')
var ical = require('ical')
var request = require('request')
var fs = require('fs')

var ICS_URL = 'http://ics.tko-aly.fi/'
var jallu_URL = 'http://jalluindeksi.xyz/price'
var EVENTS_FILE = 'events.json'

var bot = new TelegramBot(process.env.API_TOKEN, {polling: true})

var events = []
fs.readFile(EVENTS_FILE, (err, data) => {
  if (!err) {
    events = JSON.parse(data)
  }
  setTimeout(pollEvents,1000)
  setInterval(pollEvents, 15 * 60 * 1000)
})

function saveEvents(data, cb) {
  fs.writeFile(EVENTS_FILE, JSON.stringify(data), cb)
}

function pollEvents() {
  retrieveEvents(function(data) {
    saveEvents(data)
    events = data
  })
}

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

bot.onText(/\/jalluindeksi$/, function(msg, match) {
  var fromId = msg.from.id

  request(jallu_URL, function(err, res) {
    bot.sendMessage(fromId, 'Päivän hinta on ' + res.body + ' euroa!')
  })
})

bot.onText(/\/events$/, function(msg, match) {
  var fromId = msg.from.id
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
})
