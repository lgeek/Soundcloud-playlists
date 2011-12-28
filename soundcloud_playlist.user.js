// ==UserScript==
// @name           Soundcloud playlist
// @namespace      https://github.com/lgeek
// @include        http://soundcloud.com/*
// ==/UserScript==

// Known issues:
/*
  Playlists button hover
  Add to playlist hovering element created every time
*/

if ('undefined' == typeof __PAGE_SCOPE_RUN__) {
  (function page_scope_runner() {
    // If we're _not_ already running in the page, grab the full source
    // of this script.
    var my_src = "(" + page_scope_runner.caller.toString() + ")();";

    // Create a script node holding this script, plus a marker that lets us
    // know we are running in the page scope (not the Greasemonkey sandbox).
    // Note that we are intentionally *not* scope-wrapping here.
    var script = document.createElement('script');
    script.setAttribute("type", "text/javascript");
    script.textContent = "var __PAGE_SCOPE_RUN__ = true;\n" + my_src;

    // Insert the script node into the page, so it will run, and immediately
    // remove it to clean up.  Use setTimeout to force execution "outside" of
    // the user script scope completely.
    setTimeout(function() {
          document.body.appendChild(script);
          //document.body.removeChild(script);
        }, 0);
  })();

  // Stop running, because we know Greasemonkey actually runs us in
  // an anonymous wrapper.
  return;
}

SCPlaylists();

function SCPlaylists() {  
  var initialize = function() {
    $(document).bind('onAudioPlay', function (event) {
      fix_track_highlight();
      collect_dead_players();
    });

    if (localStorage.getItem('next_playlist_id') == null) {
      localStorage.setItem('next_playlist_id', 0);
      localStorage.setItem('playlists', JSON.stringify(new Array()));
    }
  }

  var initialize_ui = function() {
    insert_playlists_button();
    setup_add_to_playlist_ui();

    insert_add_to_playlist_ui();

    $(document).bind('onContentLoaded', function(){
      insert_add_to_playlist_ui();
    });
  }

  var insert_playlists_button = function() {
    $('#menu-button-upload').before('<li id = "menu-button-playlists" class = "nav no-submenu"><a id = "playlists-button" href = "#playlists">Playlists</a><div class="open-submenu"></div></li>');
    var $item = $('li#menu-button-playlists');
    var showAfter = 120,
        keepOpenFor = 500;
    $item.mouseenter(function (ev) {
      $item.stop().dequeue().scDelay(showAfter, function () {
        $item.addClass('hover');
      }).siblings().stop().dequeue().removeClass('hover');
    }).mouseleave(function (ev) {
      $item.stop().dequeue().scDelay(keepOpenFor, function () {
        $item.removeClass('hover');
      });
    });

    $('#playlists-button').click(function() {
      $.audioEngine.stop()
      show_playlists_page();
      
      setup_storage_updates_handler();
    });
  }

  var show_playlists_page = function() {
    $('#menu-button-playlists .open-submenu').show();
    var container = $('#main-wrapper-inner');
    if (container.length == 0) {
      container = $('#main-wrapper');
    }
    container.empty();
    $('body').attr('id', 'users');
    $('body').removeClass();
    $('li#menu-button-playlists div.open-submenu').attr('style', 'background-image: url("/images/nav_round_bg.png?unicorn25");\
      background-position: -200px -376px;\
      cursor: pointer;\
      display: block !important;\
      height: 6px;\
      margin: -6px 10px 0;\
      width: auto;');
    container.append('<div id = "side-content"><div class="context-item">'
                     + '<form id = "create_new_playlist"><h3>Create new playlist</h3>'
                     + '<input id = "new_playlist_name" type = "text" name = "playlist_name" value="Playlist name"/>'
                     + '<input type = "submit" value = "Create"/>'
                     + '</form></div>'
                     + '<div class="context-item">'
                     + '<h3>Playlists</h3>'
                     + '<ul id = "playlists-list" class = "sets-list"></ul>'
                     + '</div>'
                     + '</div>'
                     + '<div id = "main-content"><div id="main-content-inner">'
                     + '<div class="announcement important"><h3><strong>Please remember that this playlist functionality is provided by a 3rd party browser extension</strong></h3>'
                     + '<p>SoundCloud can\'t provide support. If you\'re having any trouble with SoundCloud, try to disable this extension first. '
                     + 'For help, go to the <a href = "https://github.com/lgeek/Soundcloud-playlists">project\'s page</a>.</p></div>'
                     + '<ul id = "playlists_main"></ul></div></div>');

    $('#create_new_playlist').submit(function() {
      var playlist_name = $('#new_playlist_name').val();
      var id = create_playlist(playlist_name)
      if (id) {
        $('#new_playlist_name').val('Playlist name');
        $('ul#playlists-list').append('<li class = "set"><a href = "#playlist_a' +id+ '">' +playlist_name+ '</a></li>');
      } else {
        alert('A playlist with the same name already exists');
      }
      //$('#create_new_playlist :submit').toggleClass('loading');
      $('input:submit', this).throb(false);
      return false;
    });

    display_playlists();
  }

  var fix_track_highlight = function() {
    var playlist = get_playing_playlist();
    var active_player = $('ol.players>li:visible div.player', playlist);
    
    $('ol.tracks>li.playing[data-sc-track="' +active_player.attr('data-sc-track')+ '"][data-sc-list-position!="' +active_player.parent().attr('data-sc-list-position')+ '"]').each(function(index, el) {
      $(el).removeClass('playing');
    });
  }

  var collect_dead_players = function() {
    var players_left = [];
    var active_player = $('ol.players>li:visible', get_playing_playlist());
  
    for (p in players_to_remove) {
      if (players_to_remove[p].get(0) != active_player.get(0)) {
        players_to_remove[p].remove();
      } else {
        players_left.push(players_to_remove[p]);
      }
    }

    players_to_remove = players_left;
  }

  var generate_player = function(position, track_id, duration, waveform, user_name, user_permalink, track_permalink_url, track_title, stream_url) {
    var minutes = parseInt(duration/60000);
    var seconds = parseInt((duration%60000)/1000);
    if (seconds < 10) seconds = '0' + seconds;

    return '<li data-sc-list-position="'+position+'" class="playlist-player" style="' +((position == 0) ? 'display: list-item; opacity: 1;' :'display: none;')+ '">\
            <div data-sc-track="' +track_id+ '" class="player mode medium no-comments">\
              <div class="container">\
                <div class="controls">\
                  <a rel="nofollow" onclick="return false;" class="play" href="#play">Play</a>\
                  <div class="timecodes"><span class="editable">0.00</span> / <span title="PT' +minutes+seconds+ '" class="duration">' +minutes+ '.' +seconds+ '</span></div>\
                </div>\
                <div class="display">\
                  <div class="progress"></div>\
                  <img unselectable="on" src="' +waveform+ '" class="waveform">\
                  <img unselectable="on" src="http://a1.sndcdn.com/images/player-overlay.png?aa27869" class="waveform-overlay">\
                  <div class="playhead aural"></div>\
                  <div class="seekhead hidden">\
                    <div><span></span></div>\
                  </div>\
                </div>\
              </div>\
              <script type="text/javascript">window.SC.bufferTracks.push({"id":' +track_id+ ',"uid":"quAAc6YoDDSV","user":{"username":"' +user_name+ '","permalink":"' +user_permalink+ '"},"uri":"' +track_permalink_url+ '","duration":' +duration+ ',"token":"v3Pvn","name":"ockeghem","title":"Ockeghem","commentable":true,"revealComments":false,"commentUri":"' +track_permalink_url+ '/comments/","streamUrl":"' +stream_url+ '?client_id=' +api_key+ '","waveformUrl":"' +waveform+ '","propertiesUri":"' +track_permalink_url+ '/properties/","statusUri":"/transcodings/quAAc6YoDDSV","replacingUid":null,"preprocessingReady":true,"renderingFailed":false,"isPublic":true,"commentableByUser":true,"makeHeardUri":false,"favorite":false,"followingTrackOwner":false,"conversations":{}});</script>\
            </div>\
          </li>';
  }

  var generate_track = function(position, track_id, track_name, user_name, permalink_url, duration, play_count) {
    var minutes = parseInt(duration/60000);
    var seconds = parseInt((duration/1000)%60);
    if (seconds < 10) seconds = '0' + seconds;

    return '<li data-sc-track="' +track_id+ '" data-sc-list-position="'+position+'" class="' +((position%2) == 0 ? 'even' : 'odd')+ '">\
            <div class="actions">\
              <a title="Download ' +track_name+ '" rel="nofollow" class="download pl-button" href="' +permalink_url+ '/download">Download track</a>\
              <a title="Go to ' +track_name+ '" class="gothere pl-button" href="' +permalink_url+ '">Go to track ' +track_name+ '</a>\
              <a title="Remove from playlist" href="#" class="remove_from_playlist" style="background-position: -79px -1140px">Remove from playlist</a>\
            </div>\
            <span class="info">\
              <span>' +(parseInt(position)+1)+ '.</span>\
              <a href="' +permalink_url+ '">' +user_name+ ' - ' +track_name+ '</a>\
              <span class="time">' +minutes+ '.' +seconds+ '</span>\
              <span class="plays">' +play_count+ ' plays</span>\
            </span>\
          </li>';
  }

  var generate_track_widget_from_id = function (id, position, playlist, player, track) {
    $.getJSON('http://api.soundcloud.com/tracks/' +id+ '.json?client_id=' + api_key, function(r) {
      var player_parent = player.parent();
      player.replaceWith(generate_player(position, r['id'], r['duration'], r['waveform_url'], r['user']['username'], r['user']['permalink'], r['permalink_url'], r['title'], r['stream_url']));
      var track_parent = track.parent();
      track.replaceWith(generate_track(position, r['id'], r['title'], r['user']['username'], r['permalink_url'], r['duration'], r['playback_count']));
      
      $('li:eq(' +position+ ') a.remove_from_playlist', track_parent).click(function() {
        remove_track_from_playlist(parseInt(position), parseInt(playlist));
        
        $(this).closest('ol.tracks>li').remove();
        var player_node = $('li[data-sc-list-position="'+position+'"]', player_parent);
        if (player_node.css('display') == 'none') {
          player_node.remove();
        } else {
          //queue current playing track for removal
          players_to_remove.push(player_node);
        }

        return false;
      });
    });
  }

  var display_playlists = function() {
    var playlists = $.parseJSON(localStorage.getItem('playlists'));
    for (var p in playlists) {
      var playlist = $.parseJSON(localStorage.getItem('playlist_' + playlists[p]['id']));

      if (playlist.length > 0) {
        var template = '<li class="set playlist" id = "playlist_' +playlists[p]['id']+ '"><div data-sc-playlist-id="846695" class="set medium">'
                       + '<div class="info-header"><h3><a name="playlist_a' +playlists[p]['id']+ '">' +playlists[p]['name']+ '</a></h3></div>'
                       + '<div class="actionbar"></div>'
                       + '<div class="set-player no-artwork"><ol class="players">';
        for (var t in playlist) {
          template += '<li class="playlist-player" style="display: none;"></li>';
        }

        template += '</ol><ol class="tracks">';

        for (var t in playlist) {
          template += '<li data-sc-list-position="' +t+ '" class="even"></li>';
        }

        template += '</ol></div></div></li>';
        
        $('#main-content-inner ul').append(template);
        
        for (var t in playlist) {
          generate_track_widget_from_id(playlist[t], t, playlists[p]['id'], $('#playlist_' + playlists[p]['id'] + ' .players li:eq(' +t+ ')'), $('#playlist_' + playlists[p]['id'] + ' .tracks li:eq(' +t+ ')'));
        }
      }
      
      $("#playlists-list").append('<li class = "set"><a href="#playlist_a' +playlists[p]['id']+ '">' +playlists[p]['name']+ '</a><a class = "delete_playlist" id = "delete_playlist_' +playlists[p]['id']+ '"style=\'float:right;background-image: url("/images/icons_mini.png?unicorn25");background-position: -79px -1158px; width: 12px; height: 16px;text-indent: -9999px;\' href = "#delete">X</a></li>');
    }
    
    $('li a.delete_playlist', '#playlists-list').click(function() {
      var playlist_id = this.id.replace('delete_playlist_', '');
      var playlist = $('li#playlist_'+playlist_id);
      if (get_playing_playlist_entry().get(0) == playlist.get(0)) {
        window.soundManager.stopAll();
      }
      
      $(this).parent().remove();
      playlist.remove();
      
      delete_playlist(playlist_id);
    });
  }

  var setup_add_to_playlist_ui = function() {
    $('form.add-to-playlist input:submit').live('click', function() {
      var playlist_id = $('select', $(this).closest('form')).val();
      var sc_track_id = $(this).closest('div.add-to-playlist-options').attr('data-sc-track');
      add_track_to_playlist(sc_track_id, playlist_id);
          
      $(this).throb(false);
      $.pulldown.close();
          
      return false;
    });

    $('.actionbar a.add-to-playlist-options.pl-button, .actionbar span.add-to-playlist-options.pl-button').live('click', function (event) {
      var track_id = $(this).closest('div.player').attr('data-sc-track');
      $(this).closest('.actions').find('div.add-to-playlist-options').attr('data-sc-track', track_id)

      var $link = $(this).blur();
      $.pulldown($link, {
          node: $link.closest('.actions').find('div.add-to-playlist-options')
      });
      return false;
    });
  }

  var insert_add_to_playlist_ui = function() {
    var players = $('.player .actionbar .actions:not(.atp)')
    $('.primary', players).append(
      '<a class = "add-to-playlist-options pl-button " style="background: none; padding-left:8px;"><span>Add to playlist</span></a>'
    );

    var add_to_playlist_options = '<div class="add-to-playlist-options action-overlay pulldown">'
                                  + '<div class="action-overlay-inner">'
                                  + '<form class = "add-to-playlist"><select style = "display: inline; margin-right: 10px; margin-bottom: 0;">';
    var playlists = $.parseJSON(localStorage.getItem('playlists'));
    for (var p in playlists) {
      add_to_playlist_options += '<option value="' +playlists[p]['id']+ '">' +playlists[p]['name']+ '</option>';
    }
    add_to_playlist_options += '</select><input type = "submit" value = "Add" style = "display: inline; margin-bottom: 0;"></form></div></div>';

    players.append(add_to_playlist_options);
    players.addClass('atp');
  }

  var get_playing_track = function() {
    return $('ol.tracks li.playing');
  }

  var get_playing_playlist_entry = function() {
    return get_playing_track().closest('li.set');
  }

  var get_playing_playlist = function()  {
    return $(get_playing_track().get(0)).closest('li.playlist');
  }

  var create_playlist = function(name) {
    var playlists = $.parseJSON(localStorage.getItem('playlists'));

    for (p in playlists) {
      if (playlists[p]['name'] == name) {
        return false
      }
    }

    var next_playlist_id = parseInt(localStorage.getItem('next_playlist_id'));

    var new_playlist = new Object();
    new_playlist['id'] = next_playlist_id;
    new_playlist['name'] = name;

    playlists.push(new_playlist);
    localStorage.setItem('playlists', JSON.stringify(playlists));
    localStorage.setItem('playlist_'+next_playlist_id, JSON.stringify(new Array()));

    localStorage.setItem('next_playlist_id', next_playlist_id +1)

    return next_playlist_id;
  }

  var add_track_to_playlist = function(track, playlist_id) {
    var tracks = $.parseJSON(localStorage.getItem('playlist_'+playlist_id));
    tracks.push(track);
    localStorage.setItem('playlist_'+playlist_id, JSON.stringify(tracks));
  }

  var remove_track_from_playlist = function(track, playlist_id) {
    var tracks = $.parseJSON(localStorage.getItem('playlist_'+playlist_id));
    
    for (var t = track +1; t < tracks.length; t++) {
      tracks[t-1] = tracks[t];
    }
    
    tracks.pop();
    localStorage.setItem('playlist_'+playlist_id, JSON.stringify(tracks));
  }

  var delete_playlist = function(playlist_id) {
    var playlists = $.parseJSON(localStorage.getItem('playlists'));
    var new_playlists = []
    
    for (p in playlists) {
      if (playlists[p]['id'] != playlist_id) {
        new_playlists.push(playlists[p]);
      }
    }

    localStorage.setItem('playlists', JSON.stringify(new_playlists));
    localStorage.removeItem('playlist_'+playlist_id);
  }

  var setup_storage_updates_handler = function() {
    $(window).bind('storage', function(e) {
      var event = e.originalEvent;

      var playlist_id = event.key.replace('playlist_', '');
      var playlist = $('li.set#' + event.key);
      var new_value = $.parseJSON(event.newValue);
      var old_value = $.parseJSON(event.oldValue);

      if (new_value.length > old_value.length) {
        var players = $('ol.players', playlist);
        var tracks = $('ol.tracks', playlist);
        players.append('<li></li>');
        tracks.append('<li></li>');

        generate_track_widget_from_id(new_value[new_value.length-1], players[0].childElementCount-1, playlist_id, $('li:last', players), $('li:last', tracks));
      }
    });
  }

  var api_key = 'ab469e781d7eaf597f9b5186363f4219';
  var players_to_remove = [];

  initialize();  

  $(document).ready(function() {
    initialize_ui();
  });
}

