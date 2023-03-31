# Grabby

![grabby icon](https://i.imgur.com/ZtRaPDN.png)

Grabby is a WebExtension that was created with the purpose of providing the same functionality that the **FlashGot** addon provided in legacy addon API and older browsers.

## Discord Server
Join Grabby's discrod server to discuss features and ask your questions

[![](https://dcbadge.vercel.app/api/server/Xu6tHt8uXs)](https://discord.gg/Xu6tHt8uXs)

## Index
- [Main Features](#main-features)
- [Screenshots](#screenshots)
- [Installation](#installation-firefox-on-windows)
- [Supported download managers](#supported-download-managers)
- [What is the toolkit?](#what-is-the-toolkit)
- [What is included in the toolkit](#what-is-included-in-the-toolkit)
- [Browser support](#browser-support)
- [OS support](#os-support)
- [Notes](#notes)
- [How to report bugs](#how-to-report-issues)

## Main features
- Allows you to download files using external download managers.
- Override's Firefox's default download dialog and lets you choose which download manager you want to download your file with.
- Allows you to download videos from video sharing sites.
- Ability to "grab" links in a page and filter them for downloading with your preferred download manager.
- Enhanced video download features for YouTube such as downloading playlists and downloading audio

## Screenshots

Overriding Firefox's download dialog
![overriding firefox download dialog](https://i.imgur.com/8mXoMxe.png)

A history of downloads of each tab is kept
![download saved for later use](https://i.imgur.com/LlPeHEu.png)

Through the right click menu you can choose to download all links in a page or links in a selection, which then opens up a window that lets you filter the links
![downloading list of links](https://i.imgur.com/4HKsws2.png)

Download videos from popular video sites in your preferred format
![downloading youtube video](https://i.imgur.com/6B7ECjv.png)

Download youtube playlists
![downloading youtube playlist](https://i.imgur.com/Bw1xH7E.png)

## Installation (Firefox on Windows)
1- First install the toolkit on your computer [using the provided setup file](https://github.com/pouriap/Grabby-Toolkit/releases/latest)

2- [Install the addon from the AMO](https://addons.mozilla.org/en-US/firefox/addon/grabby/)

**For other browsers and operating systems see [browser support](#browser-support)**

## Supported download managers
The following download managers are currently supported. 

Note that only newer version of these download managers were tested and older version might not work.

BitComet

Download Accelerator Plus

Download Accelerator Manager

EagleGet

FlareGet

Free Download Manager

GetGo

GetRight

GigaGet

Internet Download Accelerator

Internet Download Manager

Mass Downloader

Net Transport

ReGet Deluxe

wxDownload Fast

Xtreme Download Manager

Jdownloader

Thunder

## What is the toolkit?
Due to the restrictions put on WebExtensions they no longer can function like legacy addon (the way FlashGot did). So in order to provide the same functionality Grabby needs a "Native Application" in order to talk to other programs on your computer (such as your download managers). **Grabby Toolkit** provides this native application as well as other tools.

## What is included in the Toolkit?
The toolkit consists of the following tools, which are all open-source and available on github:
- **[grabby_native_app.exe](https://github.com/pouriap/Grabby-NativeApp):** Grabby native application responsible for acting as a bridge between the OS and the addon. This is a requirement by the WebExtensions API.
- **[grabby_flashgot.exe](https://github.com/pouriap/Grabby-FlashGot):** This is an updated version of the good old FlashGot.exe that was bundled with the original addon. Many parts of it are modified and new download managers are also added to it. Even more download managers will be supported in the future.
- **[yt-dlp.exe](https://github.com/yt-dlp/yt-dlp):** This is a well-known tool for downloading videos from the internet. Grabby uses this tool for downloading videos.
- **[ffmpeg.exe](https://github.com/FFmpeg/FFmpeg):** Also a well-known tool which is required by yt-dlp in order to download youtube videos.

## Browser support
**Firefox:** 

Firefox is fully supported. The addon file is signed by Mozilla and all features work on Firefox. 

**Chrome:**

Ever since Google introduced manifest v3 this addon will no longer work on Chrome. I may or may not try to port the addon for manifest v3 in the future.

**Other Chromium-based browsers (such as Brave):**

As long as the browser supports manifest v2 the addon should work but there are two limitation with Chromium-based browsers:

1- Due to lack of API support overriding the download dialog doesn't work.

2- The addon cannot be signed by Google so it cannot be installed like normal addons. In order to install it you have to add it in developer mode as described below.

**How to install on Brave browser:**

1- Install the Grabby Toolkit on your computer first (https://github.com/pouriap/Grabby-Toolkit/releases/latest)

2- Go to the [latest release page](https://github.com/pouriap/Grabby/releases/latest) and download the provided zip file

3- Extract the zip file somewhere on your computer

4- In your browser go to the "extensions" menu

5- Enable developer mode using the button at the top right

6- Click on "Load unpacked"

7- Go to the location where you extracted the zip file and choose "select folder"

The extension should be added to Brave now.

## OS Support

Currently only Windows is officially supported but if you are technical enough you might be able to get it to work with wine, tho I have not tested this yet. I will start testing on Linux as soon as I have some free time.

## Notes
This addon is currently in alpha stage which means it is not finished yet. I'm releasing it in order to get feedback from people so if you have any ideas or if you encountered any bugs feel free to open an issue.

## How to report issues?

Please feel free to report any bugs/issues/ideas by opening an issue in the repository.


## Attribution

[Files and folders icons created by juicy_fish - Flaticon](https://www.flaticon.com/free-icons/files-and-folders)

[Activist icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/activist)

