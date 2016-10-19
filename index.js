require('dotenv').config()
var TelegramBot = require('node-telegram-bot-api')
var fs = require('fs')
var moment = require('moment')
var cron = require('node-cron')
var tkoalyevents = require('tkoalyevents')
var R = require('ramda')
var request = require('request')

var EVENTS_FILE = 'events.json'
var GROUPS_FILE = 'groups.json'

var FOODLIST_URL = 'http://jallu.ml/unicafe/food'

moment.locale('fi')

if (!process.env.API_TOKEN) {
  console.error('No api token found.')
  process.exit(1)
}

var bot = new TelegramBot(process.env.API_TOKEN, {polling: true})

var events = []
var groups = []
fs.readFile(EVENTS_FILE, (err, eventsData) => {
  if (!err) {
    events = JSON.parse(eventsData)
    console.log('read', events.length, 'events')
  }
  fs.readFile(GROUPS_FILE, (err, groupsData) => {
    if (!err) {
      groups = JSON.parse(groupsData)
      console.log('read', groups.length, 'groups')
    }
    setTimeout(pollEvents, 1000)
    setInterval(pollEvents, 15 * 60 * 1000)
  })
})

function saveEvents (data, cb) {
  fs.writeFile(EVENTS_FILE, JSON.stringify(data), cb)
}

function eventDifference (data, events) {
  var difference = R.difference(data.map(e => e.id), events.map(e => e.id))
  return data.filter(e => difference.includes(e.id))
}

function pollEvents () {
  retrieveEvents(function (data) {
    saveEvents(data)
    var difference = eventDifference(data, events)
    if (difference && difference.length > 0) {
      newEvents(difference)
    }
    events = data
  })
}

function getEventURL (id) {
  return 'http://tko-aly.fi/event/' + id
}

function makeHumanReadable (dateFormat) {
  return function (e) {
    return moment(e.starts).format(dateFormat) + ': [' + e.name.trim() + '](' + getEventURL(e.id) + ')'
  }
}

function retrieveEvents (cb) {
  tkoalyevents(cb)
}

function listEvents (events, dateFormat) {
  var res = ''
  var data = events.map(makeHumanReadable(dateFormat))
  for (var i = 0; i < data.length; i++) {
    var event = data[i]
    res += event + '\n'
  }
  return res
}

function todaysEvents () {
  var today = moment()
  var data = events.filter(e => moment(e.starts).isSame(today, 'day'))
  if (data && data.length > 0) {
    data = listEvents(data, 'HH:mm')
    var res = '*Tänään:* \n' + data
    for (var j = 0; j < groups.length; j++) {
      bot.sendMessage(groups[j], res.trim(), {
        disable_web_page_preview: true,
        parse_mode: 'Markdown'
      })
    }
  }
}

function newEvents (events) {
  if (!events) {
    return
  }
  var res
  if (events.length > 1) {
    res = '*Uusia tapahtumia:* \n'
  } else {
    res = '*Uusi tapahtuma:* \n'
  }
  res += listEvents(events)
  for (var j = 0; j < groups.length; j++) {
    bot.sendMessage(groups[j], res.trim(), {
      disable_web_page_preview: true,
      parse_mode: 'Markdown'
    })
  }
}

function todaysFood (id) {
  this.createFoodList = (str, array, cb) => {
    var res = str
    var edullisesti = '*Edullisesti:* \n'
    var makeasti = '*Makeasti:*\n'
    var maukkaasti = '*Maukkaasti:*\n'
    for (var i of array) {
      switch (i.price.name) {
        case 'Edullisesti':
          // Kaunista...
          edullisesti += `  -  ${i.name} ${i.warnings.length !== 0 ? '_(' : ''}${i.warnings.join(', ')}${i.warnings.length !== 0 ? ')_' : ''} \n\n`
          break
        case 'Makeasti':
          makeasti += `  -  ${i.name} ${i.warnings.length !== 0 ? '_(' : ''}${i.warnings.join(', ')}${i.warnings.length !== 0 ? ')_' : ''} \n\n`
          break
        case 'Maukkaasti':
          maukkaasti += `  -  ${i.name} ${i.warnings.length !== 0 ? '_(' : ''}${i.warnings.join(', ')}${i.warnings.length !== 0 ? ')_' : ''} \n\n`
          break
      }
    }
    cb(res + edullisesti + maukkaasti + makeasti)
  }

  request.get(FOODLIST_URL, (err, res, body) => {
    var header = '*Päivän ruoka:* \n\n*UniCafe Exactum:* \n\n'
    if (err) return
    this.createFoodList(header, JSON.parse(body).exactum, (res) => {
      for (var j = 0; j < groups.length; j++) {
        bot.sendMessage(groups[j], res.trim(), {
          parse_mode: 'Markdown'
        });
      }
    });

    var header = '*Päivän ruoka:* \n\n*UniCafe Chemicum:* \n\n'
    this.createFoodList(header, JSON.parse(body).chemicum, (res) => {
      for (var j = 0; j < groups.length; j++) {
        bot.sendMessage(groups[j], res.trim(), {
          parse_mode: 'Markdown'
        })
      }
    })
  })
}

cron.schedule('0 0 7 * * *', todaysEvents)

cron.schedule('0 0 10 * * 1', todaysFood)
cron.schedule('0 0 10 * * 2', todaysFood)
cron.schedule('0 0 10 * * 3', todaysFood)
cron.schedule('0 0 10 * * 4', todaysFood)
cron.schedule('0 0 10 * * 5', todaysFood)

bot.on('message', function (msg) {
  if (msg.chat.type !== 'private' && groups.indexOf(msg.chat.id) === -1) {
    console.log('Found a new group:', msg.chat.id, msg.chat.title)
    groups.push(msg.chat.id)
    fs.writeFile(GROUPS_FILE, JSON.stringify(groups))
  }
})
