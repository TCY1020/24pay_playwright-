//每日手動登入jili和admin

import manual from './manual.js'

await manual.loginAdminJili()

await manual.uploadAuthJiliAuthToGce()