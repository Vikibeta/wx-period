import AV from '../libs/AV.js'
import moment from '../libs/moment.min.js'
import Temperature from '../model/temperature.js'

// get data of target month
function getMonthData (request) {
  // get target month and the month before target month, for period info calculation
  let d = new Date(request.year, request.month)
  let startDate = moment(d).subtract(1, 'months').startOf('month')
  let endDate = moment(d).add(1, 'months').startOf('month')
  let userIdQuery = new AV.Query(Temperature).equalTo('userId', AV.User.current().id)
  let startQuery = new AV.Query(Temperature).greaterThanOrEqualTo('date', startDate.toDate())
  let endQuery = new AV.Query(Temperature).lessThan('date', endDate.toDate())

  return new AV.Query.and(userIdQuery, startQuery, endQuery).descending('date').find().then(temperatureRecords => {
    // fill gaps
    let records = []
    let start = startDate.toDate()
    let totalDays = endDate.diff(startDate, 'days')

    for (let i = 0; i < totalDays; i++) {
      let date = moment(start).add(i, 'days').toDate()
      let record = temperatureRecords.filter(r => moment(r.date).isSame(date, 'day'))[0]

      console.log('format', moment().format('YYYY年MM月DD日'))
      if (record) {
        records.push({
          id: record.id,
          temperature: record.temperature,
          inPeriod: record.inPeriod,
          periodDate: 0, // start from 1. 1 means the 1st date of this period
          periodDays: 0,
          date: record.date,
          dateString: moment(record.date).format('YYYY年MM月DD日'),
          note: record.note
        })
      } else {
        records.push({
          id: null,
          temperature: null,
          inPeriod: false,
          periodDate: 0,
          periodDays: 0,
          date: date,
          dateString: moment(date).format('YYYY年MM月DD日'),
          note: ''
        })
      }
    }
    return records
  }).then(temperatureRecords => {
    // find period span and end date of target month
    let periodDays = 0
    let periodBegin = -1
    
    for (let i = 0; i < temperatureRecords.length; i++) {
      let c = temperatureRecords[i]
      let p = i > 0 ? temperatureRecords[i - 1] : null
      let n = i < temperatureRecords.length - 1 ? temperatureRecords[i + 1] : null

      if (c.inPeriod) {
        periodDays++
        if (periodBegin === -1) { // begin date of this period
          periodBegin = i
        }
        if (!n || (n && !n.inPeriod)) { // end date of this period: no next date or next date is no period date
          for (let j = periodBegin; j < i + 1; j++) {
            temperatureRecords[j].periodDays = i - periodBegin + 1
            temperatureRecords[j].periodDate = j + 1 - periodBegin
          }
        }
      } else {
        periodDays = 0
        periodBegin = -1
      }
    }
    return temperatureRecords
  }).then(temperatureRecords => {
    // only return days of target month
    return temperatureRecords.filter(r => r.date >= d)
  })
 }

function addTemperature (request) {
  return new Temperature({
    temperature: request.temperature,
    inPeriod: request.inPeriod,
    note: request.note,
    date: new Date(request.date.getFullYear(), request.date.getMonth(), request.date.getDate()),
    userId: AV.User.current().id
  }).save()
}

module.exports = {
  addTemperature,
  getMonthData
}
