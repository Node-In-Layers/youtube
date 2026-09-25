import {
  Config,
  LayerFunction,
  NilAnnotatedFunction,
} from '@node-in-layers/core'
import { z } from 'zod'
import { YoutubeNamespace } from '../types.js'

export type YtdlpDomainConfig = Readonly<{
  executablePath?: string
  pythonExecutablePath?: string
  pipxExecutablePath?: string
  autoInstallLatestOnRun?: boolean
}>

export type YtdlpConfig = Config &
  Readonly<{
    [YoutubeNamespace.ytdlp]?: YtdlpDomainConfig
  }>

export const downloadVideoArgsSchema = z.object({
  url: z.string().url(),
  outputPath: z.string().optional(),
  audioOnly: z.boolean().optional(),
  format: z.string().optional(),
  extraArgs: z.array(z.string()).optional(),
  skipAutoInstallLatest: z.boolean().optional(),
  executablePath: z.string().optional(),
  pythonExecutablePath: z.string().optional(),
  pipxExecutablePath: z.string().optional(),
})

export type DownloadVideoProps = z.infer<typeof downloadVideoArgsSchema>

export type EnsureLatestYtdlpArgs = Readonly<{
  executablePath?: string
  pythonExecutablePath?: string
  pipxExecutablePath?: string
  skipAutoInstallLatest?: boolean
}>

export type EnsureLatestYtdlpResult = Readonly<{
  wasInstallAttempted: boolean
  wasUpdated: boolean
  executablePath?: string
  pythonExecutablePath?: string
  pipxExecutablePath?: string
  stdout: string
  stderr: string
}>

export type YtdlpRunArgs = Readonly<{
  args: readonly string[]
  executablePath?: string
  pythonExecutablePath?: string
  pipxExecutablePath?: string
  skipAutoInstallLatest?: boolean
}>

export type YtdlpProcessResult = Readonly<{
  stdout: string
  stderr: string
  executablePath: string
  command: readonly string[]
  wasInstallAttempted: boolean
  wasUpdated: boolean
  installStdout?: string
  installStderr?: string
}>

export const downloadVideoResponseSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  executablePath: z.string(),
  command: z.array(z.string()),
  filePath: z.string().optional(),
  wasInstallAttempted: z.boolean(),
  wasUpdated: z.boolean(),
  installStdout: z.string().optional(),
  installStderr: z.string().optional(),
})

export type DownloadVideoResponse = z.infer<typeof downloadVideoResponseSchema>

export type YtdlpServices = Readonly<{
  ensureLatestYtdlp: LayerFunction<
    (args?: EnsureLatestYtdlpArgs) => Promise<EnsureLatestYtdlpResult>
  >
  run: LayerFunction<(args: YtdlpRunArgs) => Promise<YtdlpProcessResult>>
}>

export type YtdlpServicesLayer = Readonly<{
  [YoutubeNamespace.ytdlp]: YtdlpServices
}>

export type YtdlpFeatures = Readonly<{
  downloadVideo: NilAnnotatedFunction<DownloadVideoProps, DownloadVideoResponse>
}>

export type YtdlpFeaturesLayer = Readonly<{
  [YoutubeNamespace.ytdlp]: YtdlpFeatures
}>
