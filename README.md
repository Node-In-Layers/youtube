# YouTube - A Node In Layers Package

A Node In Layers Package for accessing Youtube.

Adds Youtube capabilities to a Node in Layers systems, with a `nil-youtube` command-line application for downloading videos and extracted audio.

## Quick start

### As a package

```sh
npm install @node-in-layers/youtube
```

### If You Want The Ability To Download Youtube Videos

1. Add the yt-dlp domain to your system config.
2. Reference the feature using `YoutubeNamespace.ytdlp`.
3. Optionally configure executable and install behavior under `YoutubeNamespace.ytdlp`.

### As a CLI application

```sh
npm install --global @node-in-layers/youtube
nil-youtube download-video -o './downloads/%(title)s.%(ext)s' https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

## API reference

### As a CLI application

Install the CLI globally:

```sh
npm install --global @node-in-layers/youtube
```

Download a video:

```sh
nil-youtube download-video -o './downloads/%(title)s.%(ext)s' https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Extract audio only:

```sh
nil-youtube download-video \
  --audio-only \
  -o './downloads/%(title)s.%(ext)s' \
  https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Emit the full JSON result for piping:

```sh
nil-youtube download-video \
  --json \
  -o './downloads/%(title)s.%(ext)s' \
  https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

If you want to bypass the default install/update attempt for one invocation:

```sh
nil-youtube download-video \
  --skip-auto-install-latest \
  --executable-path /usr/local/bin/yt-dlp \
  https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Run `nil-youtube --help` or `nil-youtube download-video --help` for the complete command reference.

### As a Node In Layers package

Install the package:

```sh
npm install @node-in-layers/youtube
```

Register the domain in your system configuration:

```ts
import {
  CoreNamespace,
  LogFormat,
  LogLevelNames,
  loadSystem,
} from '@node-in-layers/core'
import * as ytdlp from '@node-in-layers/youtube/ytdlp/index.js'
import { YoutubeNamespace, type YtdlpConfig } from '@node-in-layers/youtube'
import * as yourDomain from './src/yourDomain/index.js'

const system = await loadSystem<YtdlpConfig>({
  environment: 'production',
  config: {
    environment: 'production',
    systemName: 'my-download-app',
    [CoreNamespace.root]: {
      domains: [
        ytdlp, // Put this before your domains.
        yourDomain,
      ],
      layerOrder: ['services', 'features'],
      logging: {
        logLevel: LogLevelNames.info,
        logFormat: LogFormat.simple,
      },
    },
    [YoutubeNamespace.ytdlp]: {
      // Put optional ytdlp configuration here if needed.
    },
  },
})
```

Call the feature from the loaded system:

```ts
const result = await system.features[YoutubeNamespace.ytdlp].downloadVideo({
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  outputPath: './downloads/%(title)s.%(ext)s',
})
```

You can also configure an explicit executable or Python/pipx fallback paths:

```ts
const system = await loadSystem<YtdlpConfig>({
  environment: 'production',
  config: {
    environment: 'production',
    systemName: 'my-download-app',
    [CoreNamespace.root]: {
      domains: [youtube],
      layerOrder: ['services', 'features'],
    },
    [YoutubeNamespace.ytdlp]: {
      executablePath: '/usr/local/bin/yt-dlp',
      pythonExecutablePath: '/usr/bin/python3',
      pipxExecutablePath: '/usr/local/bin/pipx',
      autoInstallLatestOnRun: true,
    },
  },
})
```

## CLI API

The CLI uses a command structure:

```text
nil-youtube <command> [options]
```

### `download-video`

Downloads a video or extracted audio using the Node In Layers yt-dlp domain.

```text
nil-youtube download-video <url>
```

Options:

- `-o, --output-path <path>` — yt-dlp output path or template.
- `-a, --audio-only` — extract audio only.
- `-f, --format <format>` — yt-dlp format selector.
- `-x, --extra-arg <arg>` — pass an additional raw yt-dlp argument; repeat as needed.
- `--skip-auto-install-latest` — skip the default install/update attempt.
- `-e, --executable-path <path>` — explicit yt-dlp executable path.
- `-p, --python-executable-path <path>` — explicit Python executable path for pipx-managed installation.
- `--pipx-executable-path <path>` — explicit pipx executable path.
- `-j, --json` — emit the complete response as JSON.
- `-l, --log-level <level>` — Node In Layers log level; defaults to `silent`.
- `-g, --log-format <format>` — Node In Layers log format; defaults to `simple`.

## Package API

The package exports:

- `@node-in-layers/youtube` — shared types and namespace exports.
- `@node-in-layers/youtube/ytdlp/index.js` — the yt-dlp domain.

By default, the package attempts to install or update `yt-dlp` on every call unless you disable that behavior. The current fallback order is:

1. direct `pipx`
2. `python -m pipx`
3. `python -m pip install --user --upgrade pipx` followed by `python -m pipx`

If you need to fully opt out, set `autoInstallLatestOnRun: false` in config or pass `skipAutoInstallLatest: true` per invocation.
