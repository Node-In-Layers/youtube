import { strict as assert } from 'node:assert'
import { describe, it } from 'mocha'
import {
  buildDownloadArguments,
  parseDownloadedFilePath,
} from '../../../src/ytdlp/libs.js'

describe('/src/ytdlp/libs.ts', () => {
  describe('#buildDownloadArguments()', () => {
    it('should build download arguments with printing enabled', () => {
      const input = {
        url: 'https://example.com/watch?v=test',
        outputPath: '/tmp/test.%(ext)s',
        audioOnly: true,
        format: 'bestaudio',
        extraArgs: ['--no-playlist'],
      }
      const actual = buildDownloadArguments(input)
      const expected = [
        '-x',
        '-f',
        'bestaudio',
        '-o',
        '/tmp/test.%(ext)s',
        '--print',
        'after_move:filepath',
        '--no-playlist',
        'https://example.com/watch?v=test',
      ]

      assert.deepEqual(actual, expected)
    })
  })

  describe('#parseDownloadedFilePath()', () => {
    it('should return the last non-empty stdout line', () => {
      const input = 'Downloading...\n/tmp/test.mp4\n'
      const actual = parseDownloadedFilePath(input)
      const expected = '/tmp/test.mp4'

      assert.equal(actual, expected)
    })
  })
})
