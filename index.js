var TelegramBot = require('node-telegram-bot-api')
var fs = require('fs')
var moment = require('moment')
var cron = require('node-cron')
var tkoalyevents = require('tkoalyevents')

var EVENTS_FILE = 'events.json'

if (!process.env.API_TOKEN) {
  console.error('No api token found.')
  process.exit(1)
}

var bot = new TelegramBot(process.env.API_TOKEN, {polling: true})

var events = []
var groups = []
fs.readFile(EVENTS_FILE, (err, data) => {
  if (!err) {
    events = JSON.parse(data)
  }
  setTimeout(pollEvents, 1000)
  setInterval(pollEvents, 15 * 60 * 1000)
})

function saveEvents (data, cb) {
  fs.writeFile(EVENTS_FILE, JSON.stringify(data), cb)
}

function pollEvents () {
  retrieveEvents(function (data) {
    saveEvents(data)
    events = data
  })
}

function getEventURL (id) {
  return 'http://tko-aly.fi/event/' + id
}

function makeHumanReadable (e) {
  return e.starts.toDateString() + ': [' + e.name.trim() + '](' + getEventURL(e.id) + ')'
}

function retrieveEvents (cb) {
  tkoalyevents(cb)
}

function todaysEvents () {
  var today = moment()
  var data = events.filter(function (e) { return moment(e.starts).isSame(today, 'day') })
                   .map(makeHumanReadable)
  if (data) {
    var res = '*Tänään:* \n'
    for (var i = 0; i < data.length; i++) {
      var event = data[i]
      res += event + '\n'
    }
    for (var j = 0; j < groups.length; j++) {
      bot.sendMessage(groups[j], res.trim(), {
        disable_web_page_preview: true,
        parse_mode: 'Markdown'
      })
    }
  }
}

cron.schedule('0 0 7 * * *', todaysEvents)

bot.on('message', function (msg) {
  if (msg.chat.type !== 'private' && groups.indexOf(msg.chat.id) === -1) {
    groups.push(msg.chat.id)
  }
})
