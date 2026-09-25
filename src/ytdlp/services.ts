import { execFile } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, delimiter, join } from 'node:path'
import { promisify } from 'node:util'
import { ServicesContext } from '@node-in-layers/core'
import { YoutubeNamespace } from '../types.js'
import {
  EnsureLatestYtdlpArgs,
  EnsureLatestYtdlpResult,
  YtdlpConfig,
  YtdlpProcessResult,
  YtdlpRunArgs,
  YtdlpServices,
} from './types.js'

const execFileAsync = promisify(execFile)
const defaultExecutablePath = 'yt-dlp'
const kibibytesPerMebibyte = 1024
const defaultMaxBufferMebibytes = 10
const maxBuffer =
  defaultMaxBufferMebibytes * kibibytesPerMebibyte * kibibytesPerMebibyte
const pythonExecutablePattern = /^python3(?:\.\d+)?$|^python$/u
const defaultExecutableCandidates = [
  defaultExecutablePath,
  join(homedir(), '.local', 'bin', defaultExecutablePath),
  join(homedir(), 'bin', defaultExecutablePath),
]
const defaultPipxCandidates = [
  'pipx',
  join(homedir(), '.local', 'bin', 'pipx'),
  join(homedir(), 'bin', 'pipx'),
]

const uniqueValues = <T>(values: readonly T[]) => {
  return values.filter((value, index) => values.indexOf(value) === index)
}

const readDirectorySafe = (directoryPath: string) => {
  return Promise.resolve()
    .then(() => readdirSync(directoryPath))
    .catch(() => [])
}

const getPythonExecutableRank = (candidate: string) => {
  const pythonName = basename(candidate)
  const minorVersion = pythonName.startsWith('python3.')
    ? pythonName.split('.')[1]
    : undefined

  return minorVersion ? Number(minorVersion) : 0
}

type InstallAttemptResult = Readonly<{
  stdout: string
  stderr: string
  pythonExecutablePath?: string
  pipxExecutablePath?: string
}>

type InstallStrategy = Readonly<{
  label: string
  execute: () => Promise<InstallAttemptResult>
}>

const create = (context: ServicesContext<YtdlpConfig>): YtdlpServices => {
  const configuration = context.config[YoutubeNamespace.ytdlp]

  const runProcess = async (
    executablePath: string,
    args: readonly string[]
  ): Promise<Readonly<{ stdout: string; stderr: string }>> => {
    const result = await execFileAsync(executablePath, [...args], {
      maxBuffer,
    })

    return {
      stdout: result.stdout,
      stderr: result.stderr,
    }
  }

  const findWorkingExecutable = async (
    candidates: readonly string[],
    logLabel: string,
    errorMessage: string
  ) => {
    const executablePath = await candidates
      .reduce<Promise<string | undefined>>(
        (accP, candidate) =>
          accP.then(acc =>
            acc
              ? acc
              : runProcess(candidate, ['--version'])
                  .then(() => candidate)
                  .catch(error => {
                    context.log.debug(`${logLabel} candidate failed`, {
                      candidate,
                      error,
                    })
                    return undefined
                  })
          ),
        Promise.resolve(undefined)
      )
      .then(acc => {
        if (acc) {
          return acc
        }

        throw new Error(errorMessage)
      })

    return executablePath
  }

  const getPythonCandidatesFromPath = async () => {
    return (process.env.PATH || '')
      .split(delimiter)
      .filter(Boolean)
      .reduce<Promise<readonly string[]>>(
        (accP, directoryPath) =>
          accP.then(async acc => {
            const entries = await readDirectorySafe(directoryPath)

            return acc.concat(
              entries
                .filter(entry => pythonExecutablePattern.test(entry))
                .map(entry => join(directoryPath, entry))
            )
          }),
        Promise.resolve([])
      )
      .then(candidates =>
        [...candidates].sort(
          (leftCandidate, rightCandidate) =>
            getPythonExecutableRank(rightCandidate) -
            getPythonExecutableRank(leftCandidate)
        )
      )
  }

  const getPythonCandidates = async (override?: string) => {
    const pythonCandidatesFromPath = await getPythonCandidatesFromPath()

    return uniqueValues(
      [override, configuration?.pythonExecutablePath]
        .filter(Boolean)
        .concat(pythonCandidatesFromPath)
        .concat(['python3', 'python']) as string[]
    )
  }

  const getPipxCandidates = (override?: string) => {
    return uniqueValues(
      [override, configuration?.pipxExecutablePath]
        .filter(Boolean)
        .concat(defaultPipxCandidates) as string[]
    )
  }

  const resolveExecutablePath = async (override?: string) => {
    const candidates = uniqueValues(
      [override, configuration?.executablePath]
        .filter(Boolean)
        .concat(defaultExecutableCandidates) as string[]
    )

    return findWorkingExecutable(
      candidates,
      'yt-dlp',
      'Unable to resolve a working yt-dlp executable'
    )
  }

  const attemptDirectPipxInstall = async (pipxExecutablePath: string) => {
    const installResult = await runProcess(pipxExecutablePath, [
      'install',
      '--force',
      'yt-dlp',
    ])

    return {
      stdout: installResult.stdout,
      stderr: installResult.stderr,
      pipxExecutablePath,
    }
  }

  const attemptPythonModulePipxInstall = async (
    pythonExecutablePath: string
  ) => {
    const installResult = await runProcess(pythonExecutablePath, [
      '-m',
      'pipx',
      'install',
      '--force',
      'yt-dlp',
    ])

    return {
      stdout: installResult.stdout,
      stderr: installResult.stderr,
      pythonExecutablePath,
    }
  }

  const attemptPythonBootstrapPipxInstall = async (
    pythonExecutablePath: string
  ) => {
    await runProcess(pythonExecutablePath, [
      '-m',
      'pip',
      'install',
      '--user',
      '--upgrade',
      'pipx',
    ])

    const installResult = await runProcess(pythonExecutablePath, [
      '-m',
      'pipx',
      'install',
      '--force',
      'yt-dlp',
    ])

    return {
      stdout: installResult.stdout,
      stderr: installResult.stderr,
      pythonExecutablePath,
    }
  }

  const ensureLatestYtdlp = async (
    args?: EnsureLatestYtdlpArgs
  ): Promise<EnsureLatestYtdlpResult> => {
    const shouldAttemptInstall =
      args?.skipAutoInstallLatest === true
        ? false
        : (configuration?.autoInstallLatestOnRun ?? true)

    if (!shouldAttemptInstall) {
      return {
        wasInstallAttempted: false,
        wasUpdated: false,
        executablePath:
          args?.executablePath ??
          configuration?.executablePath ??
          defaultExecutablePath,
        stdout: '',
        stderr: '',
      }
    }

    const pipxCandidates = getPipxCandidates(args?.pipxExecutablePath)
    const pythonCandidates = await getPythonCandidates(
      args?.pythonExecutablePath
    )
    const installStrategies: readonly InstallStrategy[] = [
      ...pipxCandidates.map((pipxExecutablePath): InstallStrategy => ({
        label: `pipx:${pipxExecutablePath}`,
        execute: () => attemptDirectPipxInstall(pipxExecutablePath),
      })),
      ...pythonCandidates.map((pythonExecutablePath): InstallStrategy => ({
        label: `python-module-pipx:${pythonExecutablePath}`,
        execute: () => attemptPythonModulePipxInstall(pythonExecutablePath),
      })),
      ...pythonCandidates.map((pythonExecutablePath): InstallStrategy => ({
        label: `python-bootstrap-pipx:${pythonExecutablePath}`,
        execute: () => attemptPythonBootstrapPipxInstall(pythonExecutablePath),
      })),
    ]

    const installResult = await installStrategies
      .reduce<Promise<InstallAttemptResult | undefined>>(
        (accP, strategy) =>
          accP.then(acc =>
            acc
              ? acc
              : strategy.execute().catch(error => {
                  context.log.debug('yt-dlp install strategy failed', {
                    strategy: strategy.label,
                    error,
                  })
                  return undefined
                })
          ),
        Promise.resolve(undefined)
      )
      .then(acc => {
        if (acc) {
          return acc
        }

        throw new Error(
          'Unable to install or update yt-dlp using available pipx fallbacks'
        )
      })
    const executablePath = await resolveExecutablePath(args?.executablePath)

    return {
      wasInstallAttempted: true,
      wasUpdated: true,
      executablePath,
      ...(installResult.pythonExecutablePath
        ? {
            pythonExecutablePath: installResult.pythonExecutablePath,
          }
        : {}),
      ...(installResult.pipxExecutablePath
        ? {
            pipxExecutablePath: installResult.pipxExecutablePath,
          }
        : {}),
      stdout: installResult.stdout,
      stderr: installResult.stderr,
    }
  }

  const run = async (args: YtdlpRunArgs): Promise<YtdlpProcessResult> => {
    const installResult = await ensureLatestYtdlp({
      executablePath: args.executablePath,
      pythonExecutablePath: args.pythonExecutablePath,
      pipxExecutablePath: args.pipxExecutablePath,
      skipAutoInstallLatest: args.skipAutoInstallLatest,
    })
    const executablePath =
      args.executablePath ??
      installResult.executablePath ??
      (await resolveExecutablePath())
    const result = await runProcess(executablePath, args.args)

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      executablePath,
      command: [executablePath].concat([...args.args]),
      wasInstallAttempted: installResult.wasInstallAttempted,
      wasUpdated: installResult.wasUpdated,
      ...(installResult.stdout
        ? {
            installStdout: installResult.stdout,
          }
        : {}),
      ...(installResult.stderr
        ? {
            installStderr: installResult.stderr,
          }
        : {}),
    }
  }

  return {
    ensureLatestYtdlp,
    run,
  }
}

export { create }
