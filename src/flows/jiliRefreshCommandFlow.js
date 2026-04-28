import { runJiliChannelProcess, runJiliMarchantNameProcess } from '../usecases/jili/runJiliChannelProcess.js'

const registerJiliRefreshCommandFlow = async ({ 
  telegramTools,
  channelNameList,
  jiliContext,
  merchantList,
  tools,
}) => {
  let isProcessing = false

  const runRefresh = async ({ chatId }) => {
    const refreshPage = {}
    for (const name of channelNameList) {
      refreshPage[name] = await jiliContext.newPage()
    }
    const singleAccountRefreshPage = await jiliContext.newPage()

    const channelPromiseList = channelNameList.map(name =>
      runJiliChannelProcess({
        tools,
        page: refreshPage[name],
        name,
        chatId,
        telegramTools,
      }),
    )

    const resultList = await Promise.all([
      ...channelPromiseList,
      runJiliMarchantNameProcess({
        tools,
        page: singleAccountRefreshPage,
        merchantList,
        chatId,
        telegramTools,
      }),
    ])

    const channelList = resultList.slice(0, -1)
    const newGalaxyCollectionList = resultList.at(-1)

    return `
通道:
${channelList.join(', ')},

新银归集:
${newGalaxyCollectionList.join(', ')}
>>> 皆已刷新完成
`
  }

  telegramTools.onMessage({
    handler: async msg => {
      const chatId = msg.chat.id
      if (msg.text !== '/start') return

      if (isProcessing) {
        await telegramTools.sendGroupMessage({
          chatId,
          text: '正在處理中，請稍後再試',
        })

        return
      }

      isProcessing = true
      try{
        const text = await runRefresh({ chatId })
        await telegramTools.sendGroupMessage({
          chatId,
          text,
        })
      } catch (err) {
        console.error('[流程] 刷新指令處理失敗:', err?.message ?? err)
        await telegramTools.sendGroupMessage({
          chatId,
          text: `
刷新指令处理失败，请两分钟后重试,如果连续发生超过两次,请自行手动刷新,并等Jason上班时通知他,感谢!
錯誤碼:
${err?.message ?? err ?? '未知錯誤'}
`,
        })
      } finally {
        isProcessing = false
      }
    }, 
  })
}

export default registerJiliRefreshCommandFlow
