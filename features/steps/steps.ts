import { Given, Then, When, setDefaultTimeout } from '@cucumber/cucumber'
import { existsSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  CoreNamespace,
  LogFormat,
  LogLevelNames,
  loadSystem,
} from '@node-in-layers/core'
import * as ytdlpDomain from '../../src/ytdlp/index.js'
import {
  DownloadVideoResponse,
  YtdlpConfig,
  YtdlpFeatures,
} from '../../src/ytdlp/types.js'
import { YoutubeNamespace } from '../../src/types.js'

setDefaultTimeout(60_000)

type World = {
  fakePythonPath?: string
  fakeYtdlpPath?: string
  outputPath?: string
  logPath?: string
  result?: DownloadVideoResponse
}

Given('we have fake yt-dlp executables', function (this: World) {
  const fixturesDirectory = join(process.cwd(), 'features', 'fixtures')
  const fakePythonPath = join(fixturesDirectory, 'fake-python.mjs')
  const fakeYtdlpPath = join(fixturesDirectory, 'fake-yt-dlp.mjs')

  if (!existsSync(fakePythonPath) || !existsSync(fakeYtdlpPath)) {
    throw new Error('Expected fake yt-dlp fixtures to exist')
  }

  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'nil-ytdlp-'))
  const logPath = join(temporaryDirectory, 'python-log.txt')
  const outputPath = join(temporaryDirectory, 'download.%(ext)s')

  // eslint-disable-next-line functional/immutable-data
  process.env.YTDLP_TEST_LOG_PATH = logPath
  // eslint-disable-next-line functional/immutable-data
  this.fakePythonPath = fakePythonPath
  // eslint-disable-next-line functional/immutable-data
  this.fakeYtdlpPath = fakeYtdlpPath
  // eslint-disable-next-line functional/immutable-data
  this.logPath = logPath
  // eslint-disable-next-line functional/immutable-data
  this.outputPath = outputPath
})

When(
  'we download a video through the ytdlp feature',
  async function (this: World) {
    const system = await loadSystem<YtdlpConfig>({
      environment: 'test',
      config: {
        environment: 'test',
        systemName: 'youtube-feature-test',
        [CoreNamespace.root]: {
          domains: [ytdlpDomain],
          layerOrder: ['services', 'features'],
          logging: {
            logFormat: LogFormat.simple,
            logLevel: LogLevelNames.silent,
          },
        },
        [YoutubeNamespace.ytdlp]: {
          executablePath: this.fakeYtdlpPath,
          pythonExecutablePath: this.fakePythonPath,
        },
        logging: {
          consoleLogging: false,
        },
      },
    })

    const ytdlpFeatures = system.features?.getFeatures<YtdlpFeatures>(
      YoutubeNamespace.ytdlp
    )
    if (!ytdlpFeatures) {
      throw new Error(`Unable to load features for ${YoutubeNamespace.ytdlp}`)
    }

    const result = await ytdlpFeatures.downloadVideo({
      url: 'https://example.com/watch?v=test',
      outputPath: this.outputPath,
    })

    if ('error' in result) {
      throw new Error(JSON.stringify(result.error))
    }

    // eslint-disable-next-line functional/immutable-data
    this.result = result
  }
)

Then(
  'yt-dlp should attempt installation and return a downloaded file path',
  function (this: World) {
    if (!this.result) {
      throw new Error('Expected a yt-dlp result')
    }
    const installOutput = [
      this.result.installStdout || '',
      this.result.installStderr || '',
    ].join('\n')

    if (this.result.wasInstallAttempted !== true) {
      throw new Error('Expected yt-dlp installation to be attempted by default')
    }

    if (!installOutput.includes('yt-dlp')) {
      throw new Error(
        `Expected install output to mention yt-dlp installation, got: ${installOutput}`
      )
    }

    if (!this.result.filePath || !existsSync(this.result.filePath)) {
      throw new Error(
        'Expected the fake yt-dlp executable to create a downloaded file'
      )
    }
  }
)
