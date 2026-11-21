// NAME: Christian Spotify
// AUTHOR: khanhas
// DESCRIPTION: Auto skip explicit songs. Toggle in Profile menu.

/// <reference path="../globals.d.ts" />

(async function ChristianSpotify() {
  if (!Ghostify.LocalStorage) {
    setTimeout(ChristianSpotify, 1000);
    return;
  }
  await new Promise((res) => Ghostify.Events.webpackLoaded.on(res));

  let isEnabled = Ghostify.LocalStorage.get("ChristianMode") === "1";

  new Ghostify.Menu.Item("Christian mode", isEnabled, (self) => {
    isEnabled = !isEnabled;
    Ghostify.LocalStorage.set("ChristianMode", isEnabled ? "1" : "0");
    self.setState(isEnabled);
  }).register();

  Ghostify.Player.addEventListener("songchange", () => {
    if (!isEnabled) return;
    const data = Ghostify.Player.data || Ghostify.Queue;
    if (!data) return;

    const isExplicit = data.item.metadata.is_explicit;
    if (isExplicit === "true") {
      Ghostify.Player.next();
    }
  });
})();
