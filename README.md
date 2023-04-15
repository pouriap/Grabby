# Grabby

![grabby icon](https://i.imgur.com/ZtRaPDN.png)

Grabby is a WebExtension that was created with the purpose of providing the same functionality that the **FlashGot** addon provided in legacy addon API and older browsers.

## Discord Server
Join Grabby's discrod server to discuss features and ask your questions

[![](https://dcbadge.vercel.app/api/server/Xu6tHt8uXs)](https://discord.gg/Xu6tHt8uXs)

## Index
- [Main Features](#main-features)
- [Screenshots](#screenshots)
- [Installation](#installation-firefox)
- [Supported download managers](#supported-download-managers)
- [OS support](#os-support)
- [What is the toolkit?](#what-is-the-toolkit)
- [What is included in the toolkit](#what-is-included-in-the-toolkit)
- [Notes](#notes)
- [How to report bugs](#how-to-report-issues)

## Main features
- Allows you to download files using external download managers.
- Override's Firefox's default download dialog and lets you choose which download manager you want to download your file with.
- Allows you to download videos from video sharing sites.
- Ability to "grab" links in a page and filter them for downloading with your preferred download manager.
- Enhanced video download features for YouTube such as downloading playlists and downloading audio

## Screenshots

### Overriding Firefox's download dialog
![overriding firefox download dialog](https://i.imgur.com/8mXoMxe.png)

### A history of downloads of each tab is kept
![download saved for later use](https://i.imgur.com/LlPeHEu.png)

### Through the right click menu you can choose to download all links in a page or links in a selection, which then opens up a window that lets you filter the links
![downloading list of links](https://i.imgur.com/4HKsws2.png)

### Download videos from popular video sites in your preferred format
![downloading youtube video](https://i.imgur.com/6B7ECjv.png)

### Download youtube playlists
![downloading youtube playlist](https://i.imgur.com/Bw1xH7E.png)

<br />

## Installation (Firefox)
1- First install [the latest version of the toolkit](https://github.com/pouriap/Grabby-Toolkit/releases/latest) on your computer

2- [Install the addon from the AMO](https://addons.mozilla.org/en-US/firefox/addon/grabby/)

**For detailed instruction for Linux see [the relevant page in the wiki](https://github.com/pouriap/Grabby/wiki/Installing-the-toolkit-on-Linux)**

**For installing on browsers other than Firefox see [the relevant page in the wiki](https://github.com/pouriap/Grabby/wiki/Browser-Support)**

## Supported download managers
The following download managers are currently supported on Windows:

- BitComet
- Download Accelerator Plus
- Download Accelerator Manager
- EagleGet
- FlareGet
- Free Download Manager
- GetGo
- GetRight
- GigaGet
- Internet Download Accelerator
- Internet Download Manager
- Mass Downloader
- Net Transport
- ReGet Deluxe
- wxDownload Fast
- Xtreme Download Manager
- Jdownloader
- Thunder
- Any download manager that is accessible with the command line

**Notes:** 
- Only newer version of these download managers were tested and older version might not work.

- On Linux currently only download managers that are accesible from the command line are supported.

## OS Support
Windows is officially supported.

Linux is also supported but the support is limited due to the diversity of Linux distributions and the problems associated with it. Meaning I will not be able to fix every bug everyone encounters. 

That being said the ported version should theoritically work fine on all distributions.

## What is the toolkit?
Due to the restrictions put on WebExtensions they no longer can function like legacy addon (the way FlashGot did). So in order to provide the same functionality Grabby needs a "Native Application" in order to talk to other programs on your computer (such as your download managers). **Grabby Toolkit** provides this native application as well as other tools.

## What is included in the Toolkit?
The toolkit consists of the following tools, which are all open-source and available on github:
- **[grabby_native_app.exe](https://github.com/pouriap/Grabby-NativeApp):** Grabby native application responsible for acting as a bridge between the OS and the addon. This is a requirement by the WebExtensions API.
- **[grabby_flashgot.exe](https://github.com/pouriap/Grabby-FlashGot):** This is an updated version of the good old FlashGot.exe that was bundled with the original addon. Many parts of it are modified and new download managers are also added to it. Even more download managers will be supported in the future.
- **[yt-dlp.exe](https://github.com/yt-dlp/yt-dlp):** This is a well-known tool for downloading videos from the internet. Grabby uses this tool for downloading videos.
- **[ffmpeg.exe](https://github.com/FFmpeg/FFmpeg):** Also a well-known tool which is required by yt-dlp in order to download youtube videos.

## Notes
This addon is currently in alpha stage which means it is not finished yet. I'm releasing it in order to get feedback from people so if you have any ideas or if you encountered any bugs feel free to open an issue.

## How to report issues?

Please feel free to report any bugs/issues/ideas by opening an issue in the repository or sending a message on our Discord.


## Attribution

[Files and folders icons created by juicy_fish - Flaticon](https://www.flaticon.com/free-icons/files-and-folders)

[Activist icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/activist)

<br />

**This addon is dedicated to Terry A. Davis, the man who kept on pursuing his dreams in spite of his crippling mental issues.**