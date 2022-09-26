# Grabby - A Firefox Addon

Grabby is a Firefox addon that lets you download files using external download managers. It also lets you download videos from streaming sites. It aims to provide the same functionality that the **FlashGot** addon provided.

It override's Firefox's default download dialog and lets you choose which download manager you want to download your file with.

There's also a list that holds a history of recently "grabbed" downloads which can be accessed by clicking on the addons toolbar button.

There is also an options page where you can customize the addon's behavior.

## Screenshots

![https://i.imgur.com/dj261Zr.png](https://i.imgur.com/dj261Zr.png)

![https://i.imgur.com/85m99Z3.png](https://i.imgur.com/85m99Z3.png)

## The native application

In order for WebExtensions to be able to communicate with other programs they need a "Native App" to be installed on the system. It's a simple program that is responsible for doing things that the addon itself is not able to do due to WebExtensions limitations. 

## Notes:

- This addon is currently in pre-alpha stage which means it is not finished yet. I'm releasing it in order to get feedback from people so if you have any ideas or if you encountered any bugs feel free to open an issue.

- The native host actually uses an updated version of `FlashGot.exe`, the program inside the FlashGot addon that was responsible for communicating with download managers. This program is maintained in a separate repository here: https://github.com/pouriap/FlashGot-For-DownloadGrab


## How to report issues?

Please feel free to report any bugs/issues/ideas by opening an issue in the repository.


## Installation instructions
1. Go to the [latest release](https://github.com/pouriap/Firefox-DownloadGrab/releases/latest) page and download and install the native bundle
2. Download and install the addon from the same page


## Browser support
The addon works on Firefox Quantum and Waterfox Current. I haven't tested it on Waterfox Classic yet but there shouldn't be a problem if the version is recent enough to support WebExtensions.
