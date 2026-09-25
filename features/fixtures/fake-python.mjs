#!/usr/bin/env node

import fs from 'node:fs'

const logPath = process.env.YTDLP_TEST_LOG_PATH

if (logPath) {
  fs.appendFileSync(logPath, `${JSON.stringify(process.argv.slice(2))}\n`)
}

console.info('fake python ok')
