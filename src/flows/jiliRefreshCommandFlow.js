import runJiliChannelProcess from '../usecases/jili/runJiliChannelProcess.js'

const registerJiliRefreshCommandFlow = async ({ 
  telegramTools,
  channelNameList,
  jiliContext,
  tools 
}) => {
  telegramTools.onMessage({handler: async msg => {
    if (msg.text !== '/start') return

    const refreshPage = {}
    for (const name of channelNameList) {
      refreshPage[name] = await jiliContext.newPage()
    }
    const resultList = await Promise.all(
      channelNameList.map(name =>
        runJiliChannelProcess({
          tools: tools,
          page: refreshPage[name],
          name: name
        })
      )
    )

    await telegramTools.sendGroupMessage({
      chatId: msg.chat.id,
      text: `${resultList.join(', ')} >>> 皆已刷新完成`
    })
  }})
}

export default registerJiliRefreshCommandFlow
