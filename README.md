# Download Grab - A WebExtension Addon For Firefox 

Download Grab is an addon that lets you download files with external download managers. (In the future it will also support grabbing media).

It override's Firefox's default download dialog and lets you choose which download manager you want to download your file with, or if you want to download with the browser's built-in downloader.

There's also a list that holds a history of recently "grabbed" downloads which can be accessed by clicking on the addons toolbar button.

There is also an options page where you can customize the addon's behavior.

## Screenshots

![https://i.imgur.com/dj261Zr.png](https://i.imgur.com/dj261Zr.png)

![https://i.imgur.com/85m99Z3.png](https://i.imgur.com/85m99Z3.png)

## The native host

In order for WebExtensions to be able to communicate with other programs they need a "Native Host" to be installed on the system. The native host acts as a bridge between the addon and the operating system. 

Download Grab's native host is (currently) based on Node.js. You have to install this native host in order for the addon to be able to communicate with download managers installed on your system.

## Notes:
 - The addon is currently unsigned, so you'll need to do one of these things in order to use it:
 
1. Use Firefox Developer Edition or Nightly edition and set `xpinstall.signatures.required` to `false` in `about:config`. After you do this you'll be able to install unsigned addons.
2. Go to addons then click the cog icon and then choose `Debug Add-ons` and then choose `Load Temporary Add-on...`. This will load the addon into your browser until you exit.

- The addon is in alpha stage which means the UI is not the prettiest UI and there are features that are yet to be implemented and there are bugs.

- The native host actually uses an updated version of `FlashGot.exe`, the program inside the FlashGot addon that was responsible for communicating with download managers. This program is maintained in a separate repository here: https://github.com/pouriap/FlashGot-For-DownloadGrab


## How to report issues?

If the issue is about a false positive (i.e. something is detected as a download that shouldn't have) then please use the report button provided in the download dialog and in the popup dialog to report the problem.

If the issue is a bug or something else then open an issue on github.


## Installation instructions
1. Go to the [latest release](https://github.com/pouriap/Firefox-DownloadGrab/releases/latest) page and download and install the native host
2. Download and install the addon from the same page (using one of the methods suggested in the `notes` section).


## Browser support
The addon works on Firefox Quantum and Waterfox Current. I haven't tested it on Waterfox Classic yet but there shouldn't be a problem if the version is recent enough to support WebExtensions.
