const formatJiliBalanceReport = ({ lowList, threshold, payMayaBalance, MayaBusinessBalance }) => {
  const count = lowList.length
  const header = `Gcash低於 ${threshold} 的帳戶：(${count} 筆)`
  const footer = `\nPayMaya總餘: ${payMayaBalance}\nMayaB總餘: ${MayaBusinessBalance}`

  let body = ''
  if (count > 0) {
    body = lowList.map((x) => {
      if (x.name === '總共') {
        return `Gcash總餘: ${x.balance}`
      }

      return `- ${x.name} (${x.accountId}): ${x.balance}`
    }).join('\n')
  }

  return [header, body, footer].filter(Boolean).join('\n')
}

export default formatJiliBalanceReport
