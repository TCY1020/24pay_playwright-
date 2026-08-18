import getUpstreamBalances from '../usecases/upstream/getUpstreamBalances.js'
import messageFormat from '../../telegram/messageFormat.js'

const toNumericBalance = (value) => {
  const numericAmount = typeof value === 'number'
    ? value
    : Number(String(value ?? '').replace(/,/g, ''))

  return Number.isFinite(numericAmount) ? numericAmount : null
}

const NOTIFY_LIMIT = 2

const createProviderList = ({ balances, lowThresholds, highThresholds }) => {
  return [
    {
      key: 'FASTPAY',
      label: 'FastPay',
      balance: balances.fastPayBalanceData?.data?.[0]?.totalAmount,
      lowThreshold: lowThresholds.FASTPAY,
      highThreshold: highThresholds.FASTPAY,
    },
    {
      key: 'FASTPAY_BLACK',
      label: 'FastPay黑名單',
      balance: balances.fastPayBlackBalanceData?.data?.[0]?.totalAmount,
      lowThreshold: lowThresholds.FASTPAY_BLACK,
      highThreshold: highThresholds.FASTPAY_BLACK,
    },
    {
      key: 'TGPAY',
      label: 'TGPay',
      balance: balances.tgPayBalanceData?.param?.balance,
      lowThreshold: lowThresholds.TGPAY,
      highThreshold: highThresholds.TGPAY,
    },
    {
      key: 'LEEPAY',
      label: 'LeePay',
      balance: balances.leePayBalanceData?.data?.balance,
      lowThreshold: lowThresholds.LEEPAY,
      highThreshold: highThresholds.LEEPAY,
    },
  ]
}

const getNextAlerts = ({ providers, providerStates }) => {
  const lowAlerts = []
  const highAlerts = []

  for (const provider of providers) {
    const numericBalance = toNumericBalance(provider.balance)
    if (numericBalance == null) continue

    const state = providerStates[provider.key] ?? { waitFor: 'low', sentCount: 0 }
    providerStates[provider.key] = state

    if (state.waitFor === 'low') {
      const lowThreshold = toNumericBalance(provider.lowThreshold)
      if (lowThreshold == null || lowThreshold <= 0) continue

      if (numericBalance < lowThreshold) {
        lowAlerts.push({ label: provider.label, balance: numericBalance, threshold: lowThreshold })
        state.sentCount += 1

        if (state.sentCount >= NOTIFY_LIMIT) {
          state.waitFor = 'high'
          state.sentCount = 0
        }
      } else {
        state.sentCount = 0
      }

      continue
    }

    const highThreshold = toNumericBalance(provider.highThreshold)
    if (highThreshold == null || highThreshold <= 0) continue

    if (numericBalance >= highThreshold) {
      highAlerts.push({ label: provider.label, balance: numericBalance, threshold: highThreshold })
      state.sentCount += 1

      if (state.sentCount >= NOTIFY_LIMIT) {
        state.waitFor = 'low'
        state.sentCount = 0
      }
    } else {
      state.sentCount = 0
    }
  }

  return { lowAlerts, highAlerts }
}

const startLowBalanceAlertFlow = async ({
  tools,
  telegramTools,
  groupChatId,
  config,
}) => {
  const intervalMs = config.LOW_BALANCE_ALERT_INTERVAL_MS ?? 5000
  const lowThresholds = config.UPSTREAM_LOW_BALANCE_THRESHOLD ?? {}
  const highThresholds = config.UPSTREAM_HIGH_BALANCE_THRESHOLD ?? {}
  const notifyUserIds = config.NOTIFY_24PAY_SCHEDULED_REPORT_USER_ID ?? []
  const notifyUserText = notifyUserIds.length > 0
    ? `@${notifyUserIds.join(' @')}`
    : ''
  const providerStates = {}

  while (true) {
    try {
      const balances = await getUpstreamBalances({ config })
      const providers = createProviderList({ balances, lowThresholds, highThresholds })
      const { lowAlerts, highAlerts } = getNextAlerts({ providers, providerStates })

      if (lowAlerts.length > 0) {
        const text = messageFormat.formatLowBalanceAlert({ alerts: lowAlerts, notifyUserText })
        await telegramTools.sendGroupMessage({ chatId: groupChatId, text })
      }

      if (highAlerts.length > 0) {
        const text = messageFormat.formatHighBalanceAlert({ alerts: highAlerts, notifyUserText })
        await telegramTools.sendGroupMessage({ chatId: groupChatId, text })
      }
    } catch (err) {
      console.error('[流程] 低餘額警報失敗:', err?.message ?? err)
    }

    await tools.sleep(intervalMs)
  }
}

export default startLowBalanceAlertFlow
