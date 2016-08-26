var TelegramBot = require('node-telegram-bot-api')
var ical = require('ical')
var request = require('request')

var ICS_URL = 'http://ics.tko-aly.fi/'
var jallu_URL = 'http://jalluindeksi.xyz/price'

var bot = new TelegramBot(process.env.API_TOKEN, {polling: true})

var trackedGroups = []

function isTrackingGroup(id) {
  return trackedGroups.indexOf(id) > -1
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

//command to toggle group's tracking status
bot.onText(/\/tracking ?(.+)?/, function(msg, match) {
  var chatId = msg.chat.id
  var answer = ''

  //don't let anything else than group chats be tracked
  if (msg.chat.type != 'group') {
    answer = 'Only group chats can be tracked'
  } else {
    if (match[1] == null) {
      answer = 'Tracking is currently *' + (isTrackingGroup(chatId) ? 'enabled' : 'disabled') + '*\n' +
                'Actions: \n' +
                ' /tracking enable - enables tracking\n' +
                ' /tracking disable - disables tracking' 
    } else {
      if (match[1] == 'enable') {
        if (isTrackingGroup(chatId)) {
          answer = 'Tracking is already enabled!'
        } else {
          answer = 'Started tracking group!'
          trackedGroups.push(msg.chat.id)   
        }
      } else if (match[1] == 'disable') {
        if (isTrackingGroup(chatId)) {
          answer = 'Stopped tracking group!'
          trackedGroups.splice(trackedGroups.indexOf(chatId), 1)
        } else {
          answer = 'Tracking is already disabled!'
        }
      }
    }
  }

  //Send answer
  bot.sendMessage(chatId, answer, {
    parse_mode: 'Markdown'
  })
})

//check on every message if the chat is being tracked
bot.on('message', function(msg) {
  var chatId = msg.chat.id

  //only act if chat is being tracked
  if (isTrackingGroup(chatId)) {
    console.log(msg.text)
  }
})
