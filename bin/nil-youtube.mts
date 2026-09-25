#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ArgumentParser } from 'argparse'
import esMain from 'es-main'
import {
  CoreNamespace,
  isErrorObject,
  loadSystem,
  LogFormat,
  LogLevelNames,
} from '@node-in-layers/core'
import { YoutubeNamespace } from '../src/types.js'
import { YtdlpFeatures } from '../src/ytdlp/types.js'
import * as ytdlpDomain from '../src/ytdlp/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const getYoutubeVersion = () => {
  const packageJsonPath = path.join(__dirname, '../package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  return packageJson.version
}

const parseArguments = () => {
  const parser = new ArgumentParser({
    prog: 'nil-youtube',
    description:
      'A CLI tool to download videos and audio through the Node In Layers yt-dlp domain.',
  })

  parser.add_argument('-v', '--version', {
    action: 'version',
    version: getYoutubeVersion(),
  })

  const subparsers = parser.add_subparsers({
    dest: 'command',
    title: 'commands',
  })

  const downloadVideo = subparsers.add_parser('download-video', {
    help: 'Download a video or extracted audio using yt-dlp.',
  })
  downloadVideo.add_argument('url', {
    help: 'URL to download.',
  })
  downloadVideo.add_argument('-o', '--output-path', {
    help: 'yt-dlp output path or template.',
    dest: 'outputPath',
  })
  downloadVideo.add_argument('-a', '--audio-only', {
    action: 'store_true',
    default: false,
    help: 'Extract audio only.',
    dest: 'audioOnly',
  })
  downloadVideo.add_argument('-f', '--format', {
    help: 'yt-dlp format selector.',
    dest: 'format',
  })
  downloadVideo.add_argument('-x', '--extra-arg', {
    action: 'append',
    help: 'Pass an additional raw argument to yt-dlp. Repeat as needed.',
    dest: 'extraArgs',
  })
  downloadVideo.add_argument('--skip-auto-install-latest', {
    action: 'store_true',
    default: false,
    help: 'Skip the default pipx-managed yt-dlp install/update attempt.',
    dest: 'skipAutoInstallLatest',
  })
  downloadVideo.add_argument('-e', '--executable-path', {
    help: 'Explicit yt-dlp executable path.',
    dest: 'executablePath',
  })
  downloadVideo.add_argument('-p', '--python-executable-path', {
    help: 'Explicit Python executable path for pipx-managed installation.',
    dest: 'pythonExecutablePath',
  })
  downloadVideo.add_argument('--pipx-executable-path', {
    help: 'Explicit pipx executable path.',
    dest: 'pipxExecutablePath',
  })
  downloadVideo.add_argument('-j', '--json', {
    action: 'store_true',
    default: false,
    help: 'Output the full JSON response.',
    dest: 'json',
  })
  downloadVideo.add_argument('-l', '--log-level', {
    choices: Object.values(LogLevelNames),
    default: LogLevelNames.silent,
    help: 'Node In Layers log level. Defaults to silent.',
    dest: 'logLevel',
  })
  downloadVideo.add_argument('-g', '--log-format', {
    choices: Object.values(LogFormat),
    default: LogFormat.simple,
    help: 'Node In Layers log format. Defaults to simple.',
    dest: 'logFormat',
  })

  const args = parser.parse_args()
  if (!args.command) {
    parser.print_help()
    return
  }

  return args
}

const getConfig = (args: any) => {
  return {
    environment: 'production',
    systemName: 'nil-youtube-cli',
    [CoreNamespace.root]: {
      domains: [ytdlpDomain],
      layerOrder: ['services', 'features'],
      logging: {
        logLevel: args.logLevel,
        logFormat: args.logFormat,
      },
    },
  }
}

const downloadVideo = async (args: any) => {
  const system = await loadSystem({
    environment: 'production',
    config: getConfig(args),
  })
  const ytdlpFeatures = system.features?.getFeatures<YtdlpFeatures>(
    YoutubeNamespace.ytdlp
  )
  if (!ytdlpFeatures) {
    console.error(`Unable to load features for ${YoutubeNamespace.ytdlp}`)
    process.exit(1)
  }
  const result = await ytdlpFeatures.downloadVideo({
    url: args.url,
    outputPath: args.outputPath,
    audioOnly: args.audioOnly,
    format: args.format,
    extraArgs: args.extraArgs || [],
    skipAutoInstallLatest: args.skipAutoInstallLatest,
    executablePath: args.executablePath,
    pythonExecutablePath: args.pythonExecutablePath,
    pipxExecutablePath: args.pipxExecutablePath,
  })

  if (isErrorObject(result)) {
    if (args.json) {
      console.error(JSON.stringify(result, null, 2))
    } else {
      console.error('Download failed:')
      console.error(JSON.stringify(result.error, null, 2))
    }
    process.exit(1)
  }

  if (args.json) {
    console.info(JSON.stringify(result, null, 2))
    return
  }

  if (result.filePath) {
    console.info(result.filePath)
    return
  }

  console.info(result.stdout)
}

const main = async () => {
  const args = parseArguments()
  if (!args) {
    return
  }

  switch (args.command) {
    case 'download-video':
      return downloadVideo(args)
    default:
      console.error(`Unknown command: ${args.command}`)
      process.exit(1)
  }
}

if (esMain(import.meta)) {
  main()
}
