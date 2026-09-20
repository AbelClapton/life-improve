export function getDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format()
    return true
  } catch {
    return false
  }
}

export function localDateTimeToUtc(value: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match || !isValidTimeZone(timeZone)) return null
  const [, year, month, day, hour, minute] = match
  const dateKey = `${year}-${month}-${day}`
  const date = new Date(`${dateKey}T12:00:00Z`)
  if (Number.isNaN(date.getTime()) || getDateInTimeZone(date, 'UTC') !== dateKey || Number(hour) > 23 || Number(minute) > 59) return null

  const localTimestamp = Date.parse(`${value}:00Z`)

  let utcTimestamp = localTimestamp
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(utcTimestamp))
    const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]))
    const representedTimestamp = Date.parse(`${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}Z`)
    utcTimestamp += localTimestamp - representedTimestamp
  }

  const roundTrip = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(utcTimestamp)).replace(' ', 'T')

  if (roundTrip !== value) return null

  for (const offsetMinutes of [15, 30, 45, 60, 90, 120, 180]) {
    for (const direction of [-1, 1]) {
      const alternateTimestamp = utcTimestamp + direction * offsetMinutes * 60_000
      const alternate = new Intl.DateTimeFormat('sv-SE', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(alternateTimestamp)).replace(' ', 'T')
      if (alternate === value) return null
    }
  }

  return new Date(utcTimestamp).toISOString()
}

export function getUtcStartForDate(dateKey: string, timeZone: string) {
  for (let minute = 0; minute < 240; minute += 1) {
    const hour = String(Math.floor(minute / 60)).padStart(2, '0')
    const value = `${dateKey}T${hour}:${String(minute % 60).padStart(2, '0')}`
    const result = localDateTimeToUtc(value, timeZone)
    if (result) return result
  }
  return null
}

export function getUtcStartForNextDate(dateKey: string, timeZone: string) {
  const nextDate = new Date(`${dateKey}T12:00:00Z`)
  nextDate.setUTCDate(nextDate.getUTCDate() + 1)
  return getUtcStartForDate(nextDate.toISOString().slice(0, 10), timeZone)
}
