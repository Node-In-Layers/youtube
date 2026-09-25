@integration
Feature: yt-dlp video downloads

  Scenario: Downloading a video through the ytdlp feature with auto-install enabled
    Given we have fake yt-dlp executables
    When we download a video through the ytdlp feature
    Then yt-dlp should attempt installation and return a downloaded file path
