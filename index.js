require('dotenv').config()
var TelegramBot = require('node-telegram-bot-api')
var fs = require('fs')
var moment = require('moment')
var cron = require('node-cron')
var tkoalyevents = require('tkoalyevents')
var R = require('ramda')
var request = require('request')

var GROUPS_FILE = 'groups.json'

moment.locale('fi')

if (!process.env.API_TOKEN) {
  console.error('No api token found.')
  process.exit(1)
}

var bot = new TelegramBot(process.env.API_TOKEN, {polling: true})

var groups = JSON.parse(fs.readFileSync(GROUPS_FILE))

bot.on('message', function (msg) {
  if (msg.chat.type !== 'private' && groups.indexOf(msg.chat.id) === -1) {
    console.log('Found a new group:', msg.chat.id, msg.chat.title)
    groups.push(msg.chat.id)
    fs.writeFile(GROUPS_FILE, JSON.stringify(groups))
  }
})
