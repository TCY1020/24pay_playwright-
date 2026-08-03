import crypto from 'crypto'

const sing = {
  fastPay({ params, key }) {
    const sortedEntries = Object.entries(params)
      .filter(([k, v]) => k !== 'sign' && v != null && String(v) !== '')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

    const query = sortedEntries
      .map(([k, v]) => `${k}=${v}`)
      .join('&')

    const raw = query + key

    return crypto.createHash('md5').update(raw, 'utf8').digest('hex').toLowerCase()
  },
}

export default sing
