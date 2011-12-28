SoundCloud playlists
====================

What
----
This is a [Greasemonkey](http://www.greasespot.net/) script which adds a new feature to [SoundCloud](http://soundcloud.com): playlists. You can create any number of playlists and you can add any track from the site to your playlists. Unlike sets, playlists can include tracks from other users. Please keep in mind that playlists can't be shared or made public (yet).

To install this extension you need to use [Chrome](https://www.google.com/chrome) (works natively) or [Firefox](http://www.getfirefox.net/) with the [Greasemonkey extension](http://www.greasespot.net/). In addition, localStorage needs to be enabled (it is by default). Just open [this link](https://github.com/lgeek/Soundcloud-playlists/raw/master/soundcloud_playlist.user.js) to get the latest version.

Why
---
[SoundCloud](http://soundcloud.com) is a web platform for creating and sharing *sounds*. It has grown large enough that I constantly discover *music* that I enjoy. However, most of the development efforts seem to have been focused on handling growth and adding features for sharing - which makes perfect sense considering their stated mission. Well, I took it upon myself to implement the one major feature which I felt was needed to facilitate music consumption: user defined playlists.

Things to keep in mind
----------------------
Please note that the playlists are saved in your browser, not on SoundCloud servers. This means that if you change your browser, computer, or if you delete private data for SoundCloud, _you will lose your playlists_. This also means that at the moment you can't share the playlists.

This browser extension injects JavaScript into all HTML pages from SoundCloud.com. This means that _it can break the website_ (from your point of view). If you seem to have any problems, please disable this extension to make sure it doesn't cause them. This project is very new, so it's bound to have some bugs.

I've only tried this extension on Firefox 9 and Chrome 16. Should work with older versions as well, but not with really old ones.

What works
----------
* You can create and delete playlists.
* You can add and delete tracks to/from playlists.
* You can listen to your playlists.
* If a track is added to a playlist while you have the playlists page open in another tab, the track will get added to the playlist in realtime.
* UI elements required for the features mentions above work correctly.

What doesn't work
-----------------
Consider this a TODO list. In no particular order:

* Tracks can't be reordered inside playlists.
* If you have more than one tab open with your playlists, they might get in an inconsistent state. If you delete a track or a playlist in one tab, it won't be removed from the second one until you refresh it. You might even get some JavaScript errors.
* Tracks can't be saved somewhere online, neither can they be shared.
* The back button doesn't work correctly from the playlists page. Related: if you refresh the playlists page, you'll get instead the previous page.
* If you delete a track from a playlist, the index and background colour of the following tracks isn't updated.

Implementation overview
-----------------------
A list of playlists and the tracks in each playlist are saved as serialized JSON in localStorage. The data for each track is obtained via the SoundCloud API each time a track is displayed. It might not scale well with large collections, but at least the API requests are cached locally.

Playlists are displayed in the same way as sets are displayed on SoundCloud. TODO: some track data is faked and might be unnecessary anyway.

The playlists page is updated with new tracks by registering a handler for _storage_ events. This can also be used to keep two playlists tabs in sync.

