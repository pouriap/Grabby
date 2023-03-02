# Grabby

Grabby is a WebExtension that was created with the purpose of providing the same functionality that the **FlashGot** addon provided in legacy addon API and older browsers.

## Index:
- [Main Features](#main-features)
- [Screenshots](#screenshots)
- [Installation](#installation)
- [What is the toolkit?](#what-is-grabby-toolkit)
- [What is included in the toolkit](#what-is-included-in-the-toolkit)
- [Notes](#notes)
- [How to report bugs](#how-to-report-issues)
- [Browser and OS support](#browser-and-os-support)

## Main features
- Allows you to download files using external download managers.
- Override's Firefox's default download dialog and lets you choose which download manager you want to download your file with.
- Allows you to download videos from video sharing sites.
- Ability to "grab" links in a page and filter them for downloading with your preferred download manager.
- Enhanced video download features for YouTube such as downloading playlists and downloading audio

## Screenshots

![overriding firefox download dialog](https://i.imgur.com/8mXoMxe.png)

![download saved for later use](https://i.imgur.com/LlPeHEu.png)

![downloading list of links](https://i.imgur.com/4HKsws2.png)

![downloading youtube video](https://i.imgur.com/6B7ECjv.png)

![downloading youtube playlist](https://i.imgur.com/Bw1xH7E.png)

## Installation
1- Install the addon on your browser

2- Install the toolkit on your computer (Currently only Windows is supported)

The latest version of the addon and the toolkit can be found at [here.](https://github.com/pouriap/Grabby/releases/latest)

## What is the toolkit?
Due to the restrictions put on WebExtensions they no longer can function like legacy addon (the way FlashGot did). So in order to provide the same functionality Grabby needs a "Native Application" in order to talk to other programs on your computer (such as your download managers). **Grabby Toolkit** provides this native application as well as other tools.

## What is included in the Toolkit?
The toolkit consists of the following tools, which are all open-source and available on github:
- **[grabby_native_app.exe](https://github.com/pouriap/Grabby-NativeApp):** Grabby native application responsible for acting as a bridge between the OS and the addon. This is a requirement by the WebExtensions API.
- **[grabby_flashgot.exe](https://github.com/pouriap/Grabby-FlashGot):** This is an updated version of the good old FlashGot.exe that was bundled with the original addon. Many parts of it are modified and new download managers are also added to it. Even more download managers will be supported in the future.
- **[yt-dlp.exe](https://github.com/yt-dlp/yt-dlp):** This is a well-known tool for downloading videos from the internet. Grabby uses this tool for downloading videos.
- **[ffmpeg.exe](https://github.com/FFmpeg/FFmpeg):** Also a well-known tool which is required by yt-dlp in order to download youtube videos.

## Notes
This addon is currently in pre-alpha stage which means it is not finished yet. I'm releasing it in order to get feedback from people so if you have any ideas or if you encountered any bugs feel free to open an issue.

## How to report issues?

Please feel free to report any bugs/issues/ideas by opening an issue in the repository.


## Browser and OS support
Currently the addon only works on Firefox on Windows. I'm planning to provide a version for Chromium-based browsers in the future but the override download dialog feature is only avaiable on Firefox because it has the only API that supports this.

Linux is not supported yet but it's quite possible that it will work with wine if you're technical enough to manually set everything up.

I have very limited free time but after the addon itself is complete I will start working on the ports for other browsers (namely Brave) and Linux.