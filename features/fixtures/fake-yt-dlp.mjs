#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)

if (args.includes('--version')) {
  console.info('2026.09.25')
  process.exit(0)
}

const outputPathIndex = args.indexOf('-o')
const outputTemplate =
  outputPathIndex >= 0 ? args[outputPathIndex + 1] : './download.%(ext)s'
const extension = args.includes('-x') ? 'mp3' : 'mp4'
const filePath = outputTemplate.includes('%(ext)s')
  ? outputTemplate.replace('%(ext)s', extension)
  : outputTemplate

fs.mkdirSync(path.dirname(filePath), { recursive: true })
fs.writeFileSync(filePath, 'fake yt-dlp output\n')

console.info('fake yt-dlp download complete')
console.info(filePath)
