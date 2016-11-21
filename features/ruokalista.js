var request = require('request')
var cron = require('node-cron')

var FOODLIST_URL = 'http://messi.hyyravintolat.fi/publicapi/restaurant/'

function todaysFood (bot) {
  var now = new Date()
  var d = now.getDate() < 10 ? '0' + now.getDate() : '' + now.getDate()
  d += '.'
  d += (now.getMonth() + 1) < 10 ? '0' + (now.getMonth() + 1) : '' + (now.getMonth() + 1)

  this.createFoodList = (str, array, cb) => {
    var res = str

    var edullisesti = '*Edullisesti:* \n'
    var makeasti = '*Makeasti:*\n'
    var maukkaasti = '*Maukkaasti:*\n'
    for (var o of array) {
      if (o.date.split(' ')[1] === d) {
        for (var i of o.data) {
          switch (i.price.name) {
            case 'Edullisesti':
              edullisesti += '  - ' + i.name + '\n'
              break
            case 'Makeasti':
              makeasti += '  - ' + i.name + '\n'
              break
            case 'Maukkaasti':
              maukkaasti += '  - ' + i.name + '\n'
              break
          }
        }
        cb(res + edullisesti + maukkaasti + makeasti)
      }
    }
  }

  request.get(FOODLIST_URL + '11', (err, res, body) => {
    var header = '*Päivän ruoka:* \n\n*UniCafe Exactum:* \n\n'
    if (err) return
    this.createFoodList(header, JSON.parse(body).data, (res) => {
      for (var j = 0; j < groups.length; j++) {
        bot.sendMessage(groups[j], res.trim(), {
          parse_mode: 'Markdown'
        })
      }
    })
  })

  request.get(FOODLIST_URL + '10', (err, res, body) => {
    var header = '*Päivän ruoka:* \n\n*UniCafe Chemicum:* \n\n'
    if (err) return
    this.createFoodList(header, JSON.parse(body).data, (res) => {
      for (var j = 0; j < groups.length; j++) {
        bot.sendMessage(groups[j], res.trim(), {
          parse_mode: 'Markdown'
        })
      }
    })
  })
}

module.exports = function (bot) {
  cron.schedule('0 0 10 * * 1-5', todaysFood.bind(bot))
}
