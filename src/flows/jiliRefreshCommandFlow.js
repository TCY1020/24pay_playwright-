import { runJiliChannelProcess,runJiliMarchantNameProcess } from '../usecases/jili/runJiliChannelProcess.js'

const registerJiliRefreshCommandFlow = async ({ 
  telegramTools,
  channelNameList,
  jiliContext,
  merchantList,
  tools,
}) => {
  telegramTools.onMessage({ handler: async msg => {
    if (msg.text !== '/start') return

    const refreshPage = {}
    for (const name of channelNameList) {
      refreshPage[name] = await jiliContext.newPage()
    }
    const singleAccountRefreshPage = await jiliContext.newPage()
    
    const promiseList = channelNameList.map(name =>
      runJiliChannelProcess({
        tools: tools,
        page: refreshPage[name],
        name: name
      })
    )
    promiseList.push(runJiliMarchantNameProcess({
      tools: tools,
      page: singleAccountRefreshPage,
      merchantList: merchantList,
    }))
    const resultList = await Promise.all(promiseList)

    const channelList = resultList.slice(0, -1)
    const newGalaxyCollectionList = resultList.at(-1)

    const text = `
通道:
${channelList.join(', ')},

新银规集:
${newGalaxyCollectionList.join(', ')}
>>> 皆已刷新完成
`

    await telegramTools.sendGroupMessage({
      chatId: msg.chat.id,
      text: text
    })
      } })
    }

export default registerJiliRefreshCommandFlow
