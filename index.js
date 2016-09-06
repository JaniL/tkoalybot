var TelegramBot = require('node-telegram-bot-api')
var ical = require('ical')
var request = require('request')
var fs = require('fs')
var moment = require('moment')
var cron = require('node-cron')

var ICS_URL = 'http://ics.tko-aly.fi/'
var JALLU_URL = 'http://jalluindeksi.xyz/price'
var EVENTS_FILE = 'events.json'
var GROUPS_FILE = 'groups.json'

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

function makeHumanReadable (e) {
  return new Date(e.start).toDateString() + ': [' + e.summary.trim() + '](' + e.url + ')'
}

function retrieveEvents (cb) {
  request(ICS_URL, function (err, res) {
    var data = ical.parseICS(res.body)

    data = Object.keys(data).map(function (k) {
      return data[k]
    }).filter(function (e) {
      return e.type === 'VEVENT'
    })

    cb(data)
  })
}

function todaysEvents () {
  var today = moment()
  var data = events.filter(function (e) { return moment(e.start).isSame(today, 'day') })
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

function todaysFood(id) {
  var now = new Date()
  var d = now.getDate() < 10 ? '0' + now.getDate() : '' + now.getDate()
  d += '.'
  d += (now.getMonth() + 1) < 10 ? '0' + (now.getMonth() + 1) : '' + (now.getMonth() + 1)

  request.get('http://messi.hyyravintolat.fi/publicapi/restaurant/10', (err, res, body) => {
    var res = '';
    if (err) return

    for (var o of JSON.parse(body).data) {
      if (o.date.split(' ')[1] === d) {
        for (var i of o.data) {
          res += i.price.name + ': ' + i.name + '\n';
        }
      }
    }

      bot.sendMessage(id, res.trim(), {
        parse_mode: 'Markdown'
      })
  })
}

todaysFood()

cron.schedule('0 0 7 * * *', todaysEvents)
cron.schedule('0 1 0 * * *', todaysFood)

bot.on('message', function (msg) {
  if (msg.chat.type !== 'private' && groups.indexOf(msg.chat.id) === -1) {
    groups.push(msg.chat.id)
  }
})
