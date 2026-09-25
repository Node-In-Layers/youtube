import {
  FeaturesContext,
  annotatedFunction,
  createErrorObject,
} from '@node-in-layers/core'
import { YoutubeNamespace } from '../types.js'
import { buildDownloadArguments, parseDownloadedFilePath } from './libs.js'
import {
  downloadVideoArgsSchema,
  downloadVideoResponseSchema,
  DownloadVideoProps,
  DownloadVideoResponse,
  YtdlpConfig,
  YtdlpFeatures,
  YtdlpServicesLayer,
} from './types.js'

const create = (
  context: FeaturesContext<YtdlpConfig, YtdlpServicesLayer>
): YtdlpFeatures => {
  const downloadVideo = annotatedFunction(
    {
      functionName: 'downloadVideo',
      domain: YoutubeNamespace.ytdlp,
      description:
        'Downloads a video or extracted audio from a URL using yt-dlp.',
      args: downloadVideoArgsSchema,
      returns: downloadVideoResponseSchema,
    },
    ((props: DownloadVideoProps, crossLayerProps) =>
      Promise.resolve()
        .then(async (): Promise<DownloadVideoResponse> => {
          const result = await context.services[YoutubeNamespace.ytdlp].run(
            {
              args: buildDownloadArguments(props),
              executablePath: props.executablePath,
              pythonExecutablePath: props.pythonExecutablePath,
              pipxExecutablePath: props.pipxExecutablePath,
              skipAutoInstallLatest: props.skipAutoInstallLatest,
            },
            crossLayerProps
          )
          const filePath = parseDownloadedFilePath(result.stdout)

          return {
            ...result,
            command: [...result.command],
            ...(filePath
              ? {
                  filePath,
                }
              : {}),
          }
        })
        .catch(error =>
          createErrorObject(
            'YTDLP_DOWNLOAD_VIDEO_FAILED',
            'Failed to download video with yt-dlp',
            error
          )
        )) as Parameters<
      typeof annotatedFunction<DownloadVideoProps, DownloadVideoResponse>
    >[1]
  ) as YtdlpFeatures['downloadVideo']

  return {
    downloadVideo,
  }
}

export { create }
