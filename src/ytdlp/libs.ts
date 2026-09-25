import { DownloadVideoProps } from './types.js'

const printedFilePathArgument = 'after_move:filepath'

const buildDownloadArguments = (args: DownloadVideoProps) => {
  return [
    ...(args.audioOnly ? ['-x'] : []),
    ...(args.format ? ['-f', args.format] : []),
    ...(args.outputPath ? ['-o', args.outputPath] : []),
    '--print',
    printedFilePathArgument,
    ...(args.extraArgs || []),
    args.url,
  ]
}

const parseDownloadedFilePath = (stdout: string) => {
  const lines = stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  return lines.length ? lines[lines.length - 1] : undefined
}

export { buildDownloadArguments, parseDownloadedFilePath }
