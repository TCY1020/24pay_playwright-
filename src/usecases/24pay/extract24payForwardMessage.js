const FORWARDED_MESSAGE_TYPE = 1

const extract24payForwardMessage = (payload) => {
  const cleanedPayload = payload.replace(/\u001e/g, '')
  const messageObject = JSON.parse(cleanedPayload)

  if (messageObject.type !== FORWARDED_MESSAGE_TYPE) return null

  return messageObject.arguments?.[0] ?? null
}

export default extract24payForwardMessage
