window.Ghostify = {
  Player: {
    addEventListener: (type, callback) => {
      if (!(type in Ghostify.Player.eventListeners)) {
        Ghostify.Player.eventListeners[type] = [];
      }
      Ghostify.Player.eventListeners[type].push(callback);
    },
    dispatchEvent: (event) => {
      if (!(event.type in Ghostify.Player.eventListeners)) {
        return true;
      }
      const stack = Ghostify.Player.eventListeners[event.type];
      for (let i = 0; i < stack.length; i++) {
        if (typeof stack[i] === "function") {
          stack[i](event);
        }
      }
      return !event.defaultPrevented;
    },
    eventListeners: {},
    seek: (p) => {
      const duration = !Number.isInteger(p) && p >= 0 && p <= 1 ? Math.round(p * Ghostify.Player.origin._state.duration) : p;
      Ghostify.Player.origin.seekTo(duration);
    },
    getProgress: () => {
      const state = Ghostify.Player.origin._state;
      return (state.isPaused ? 0 : Date.now() - state.timestamp) + state.positionAsOfTimestamp;
    },
    getProgressPercent: () => {
      const state = Ghostify.Player.origin._state;
      return Ghostify.Player.getProgress() / state.duration;
    },
    getDuration: () => Ghostify.Player.origin._state.duration,
    setVolume: (v) => {
      Ghostify.Platform.PlaybackAPI.setVolume(v);
    },
    increaseVolume: () => {
      Ghostify.Platform.PlaybackAPI.raiseVolume();
    },
    decreaseVolume: () => {
      Ghostify.Platform.PlaybackAPI.lowerVolume();
    },
    getVolume: () => Ghostify.Platform.PlaybackAPI._volume,
    next: () => {
      Ghostify.Player.origin.skipToNext();
    },
    back: () => {
      Ghostify.Player.origin.skipToPrevious();
    },
    togglePlay: () => {
      if (Ghostify.Player.isPlaying()) Ghostify.Player.pause();
      else Ghostify.Player.play();
    },
    isPlaying: () => !Ghostify.Player.origin._state.isPaused,
    toggleShuffle: () => {
      Ghostify.Player.origin.setShuffle(!Ghostify.Player.origin._state.shuffle);
    },
    getShuffle: () => Ghostify.Player.origin._state.shuffle,
    setShuffle: (b) => {
      Ghostify.Player.origin.setShuffle(b);
    },
    toggleRepeat: () => {
      Ghostify.Player.origin.setRepeat((Ghostify.Player.origin._state.repeat + 1) % 3);
    },
    getRepeat: () => Ghostify.Player.origin._state.repeat,
    setRepeat: (r) => {
      Ghostify.Player.origin.setRepeat(r);
    },
    getMute: () => Ghostify.Player.getVolume() === 0,
    toggleMute: () => {
      Ghostify.Player.setMute(!Ghostify.Player.getMute());
    },
    setMute: (b) => {
      if (b !== Ghostify.Player.getMute()) {
        document.querySelector(".volume-bar__icon-button")?.click();
      }
    },
    formatTime: (ms) => {
      let seconds = Math.floor(ms / 1e3);
      const minutes = Math.floor(seconds / 60);
      seconds -= minutes * 60;
      return `${minutes}:${seconds > 9 ? "" : "0"}${String(seconds)}`;
    },
    getHeart: () => Ghostify.Player.origin._state.item?.metadata["collection.in_collection"] === "true",
    pause: () => {
      Ghostify.Player.origin.pause();
    },
    play: () => {
      Ghostify.Player.origin.resume();
    },
    playUri: async (uri, context = {}, options = {}) => {
      return await Ghostify.Player.origin.play({ uri: uri }, context, options);
    },
    removeEventListener: (type, callback) => {
      if (!(type in Ghostify.Player.eventListeners)) return;
      const stack = Ghostify.Player.eventListeners[type];
      for (let i = 0; i < stack.length; i++) {
        if (stack[i] === callback) {
          stack.splice(i, 1);
          return;
        }
      }
    },
    skipBack: (amount = 15e3) => {
      Ghostify.Player.origin.seekBackward(amount);
    },
    skipForward: (amount = 15e3) => {
      Ghostify.Player.origin.seekForward(amount);
    },
    setHeart: (b) => {
      const uris = [Ghostify.Player.origin._state.item.uri];
      if (b) {
        Ghostify.Platform.LibraryAPI.add({ uris });
      } else {
        Ghostify.Platform.LibraryAPI.remove({ uris });
      }
    },
    toggleHeart: () => {
      Ghostify.Player.setHeart(!Ghostify.Player.getHeart());
    },
  },
  test: () => {
    function checkObject(object) {
      const { objectToCheck, methods, name } = object;
      let count = methods.size;

      for (const method of methods) {
        if (objectToCheck[method] === undefined || objectToCheck[method] === null) {
          console.error(`${name}.${method} is not available. Please open an issue in the Ghostify repository to inform us about it.`);
          count--;
        }
      }
      console.log(`${count}/${methods.size} ${name} methods and objects are OK.`);

      for (const key of Object.keys(objectToCheck)) {
        if (!methods.has(key)) {
          console.warn(`${name} method ${key} exists but is not in the method list. Consider adding it.`);
        }
      }
    }

    const objectsToCheck = new Set([
      {
        objectToCheck: Ghostify,
        name: "Ghostify",
        methods: new Set([
          "Player",
          "addToQueue",
          "CosmosAsync",
          "getAudioData",
          "Keyboard",
          "URI",
          "LocalStorage",
          "Queue",
          "removeFromQueue",
          "showNotification",
          "Menu",
          "ContextMenu",
          "React",
          "Mousetrap",
          "Locale",
          "ReactDOM",
          "Topbar",
          "ReactComponent",
          "PopupModal",
          "SVGIcons",
          "colorExtractor",
          "test",
          "Platform",
          "_platform",
          "Config",
          "expFeatureOverride",
          "createInternalMap",
          "RemoteConfigResolver",
          "Playbar",
          "Tippy",
          "_getStyledClassName",
          "GraphQL",
          "ReactHook",
          "AppTitle",
          "_reservedPanelIds",
          "ReactFlipToolkit",
          "classnames",
          "ReactQuery",
          "Color",
          "extractColorPreset",
          "ReactDOMServer",
          "Snackbar",
          "ContextMenuV2",
          "ReactJSX",
          "_renderNavLinks",
          "Events",
        ]),
      },
      {
        objectToCheck: Ghostify.Player,
        name: "Ghostify.Player",
        methods: new Set([
          "addEventListener",
          "back",
          "data",
          "decreaseVolume",
          "dispatchEvent",
          "eventListeners",
          "formatTime",
          "getDuration",
          "getHeart",
          "getMute",
          "getProgress",
          "getProgressPercent",
          "getRepeat",
          "getShuffle",
          "getVolume",
          "increaseVolume",
          "isPlaying",
          "next",
          "pause",
          "play",
          "removeEventListener",
          "seek",
          "setMute",
          "setRepeat",
          "setShuffle",
          "setVolume",
          "skipBack",
          "skipForward",
          "toggleHeart",
          "toggleMute",
          "togglePlay",
          "toggleRepeat",
          "toggleShuffle",
          "origin",
          "playUri",
          "setHeart",
        ]),
      },
      {
        objectToCheck: Ghostify.ReactComponent,
        name: "Ghostify.ReactComponent",
        methods: new Set([
          "RightClickMenu",
          "ContextMenu",
          "Menu",
          "MenuItem",
          "AlbumMenu",
          "PodcastShowMenu",
          "ArtistMenu",
          "PlaylistMenu",
          "TrackMenu",
          "TooltipWrapper",
          "TextComponent",
          "IconComponent",
          "ConfirmDialog",
          "Slider",
          "RemoteConfigProvider",
          "ButtonPrimary",
          "ButtonSecondary",
          "ButtonTertiary",
          "Snackbar",
          "Chip",
          "Toggle",
          "Cards",
          "Router",
          "Routes",
          "Route",
          "StoreProvider",
          "PlatformProvider",
          "Dropdown",
          "MenuSubMenuItem",
          "Navigation",
          "ScrollableContainer",
        ]),
      },
      {
        objectToCheck: Ghostify.ReactComponent.Cards,
        name: "Ghostify.ReactComponent.Cards",
        methods: new Set([
          "Default",
          "Hero",
          "CardImage",
          "Album",
          "Artist",
          "Audiobook",
          "Episode",
          "Playlist",
          "Profile",
          "Show",
          "Track",
          "FeatureCard",
        ]),
      },
      {
        objectToCheck: Ghostify.ReactHook,
        name: "Ghostify.ReactHook",
        methods: new Set(["DragHandler", "useExtractedColor"]),
      },
    ]);

    for (const object of objectsToCheck) {
      checkObject(object);
    }
  },
  GraphQL: {
    Definitions: {},
  },
  ReactComponent: {},
  ReactHook: {},
  ReactFlipToolkit: {},
  Snackbar: {},
  Platform: {},
};
