const upstreamApi = {
  async getFastPayBalance({ params, domain }) {
    const url = `${domain}/api/account/searchAccount`
    const headers = {
      'Content-Type': 'application/json',
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    })
    
    return response.json()
  },
  async getTgPayBalance({ params, domain }) {
    const url = `${domain}/payment/query/balance`
    const headers = {
      'Content-Type': 'application/json',
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    })

    return response.json()
  },

  async getLeePayBalance({ token, domain }) {
    const url = `${domain}/api/balance/inquiry`
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    return response.json()
  },
}

export default upstreamApi