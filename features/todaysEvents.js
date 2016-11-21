var fs = require('fs')
var R = require('ramda')
var cron = require('node-cron')
var tkoalyevents = require('tkoalyevents')
var moment = require('moment')
moment.locale('fi')

var EVENTS_FILE = 'events.json'
var events = JSON.parse(fs.readFileSync(EVENTS_FILE))

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

setTimeout(pollEvents, 1000)
setInterval(pollEvents, 15 * 60 * 1000)

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

cron.schedule('0 0 7 * * *', todaysEvents)
