import { waitFor } from "./shared/async.js";

(function waitOrigins() {
  if (!Ghostify?.Player?.origin?._state) {
    setTimeout(waitOrigins, 10);
    return;
  }

  const playerState = {
    cache: null,
    current: null,
  };

  const interval = setInterval(() => {
    if (!Ghostify.Player.origin._state?.item) return;
    Ghostify.Player.data = Ghostify.Player.origin._state;
    playerState.cache = Ghostify.Player.data;
    clearInterval(interval);
  }, 10);

  Ghostify.Player.origin._events.addListener("update", ({ data: playerEventData }) => {
    playerState.current = playerEventData.item ? playerEventData : null;
    Ghostify.Player.data = playerState.current;

    if (playerState.cache?.item?.uri !== playerState.current?.item?.uri) {
      const event = new Event("songchange");
      event.data = Ghostify.Player.data;
      Ghostify.Player.dispatchEvent(event);
    }

    if (playerState.cache?.isPaused !== playerState.current?.isPaused) {
      const event = new Event("onplaypause");
      event.data = Ghostify.Player.data;
      Ghostify.Player.dispatchEvent(event);
    }

    playerState.cache = playerState.current;
  });

  (function waitProductStateAPI() {
    if (!Ghostify.Platform?.UserAPI) {
      setTimeout(waitProductStateAPI, 100);
      return;
    }

    const productState = Ghostify.Platform.UserAPI._product_state || Ghostify.Platform.UserAPI._product_state_service;
    if (productState) return;

    const productStateApi = Ghostify.Platform?.ProductStateAPI?.productStateApi;
    if (!productStateApi) {
      setTimeout(waitProductStateAPI, 100);
      return;
    }

    Ghostify.Platform.UserAPI._product_state_service = productStateApi;
  })();

  void (async function setButtonsHeight() {
    const CosmosAsync = await waitFor(() => Ghostify.CosmosAsync, 100);
    const expFeatures = JSON.parse(localStorage.getItem("ghostify-exp-features") || "{}");
    const isGlobalNavbar = expFeatures?.enableGlobalNavBar?.value;

    if (typeof isGlobalNavbar !== "undefined" && isGlobalNavbar === "control") {
      await CosmosAsync.post("sp://messages/v1/container/control", {
        type: "update_titlebar",
        height: Ghostify.Platform.PlatformData.os_name === "osx" ? "42" : "40",
      });
    }
  })();

  setInterval(() => {
    if (playerState.cache?.isPaused === false) {
      const event = new Event("onprogress");
      event.data = Ghostify.Player.getProgress();
      Ghostify.Player.dispatchEvent(event);
    }
  }, 100);

  Ghostify.addToQueue = (uri) => {
    return Ghostify.Player.origin._queue?.addToQueue(uri);
  };
  Ghostify.removeFromQueue = (uri) => {
    return Ghostify.Player.origin._queue?.removeFromQueue(uri);
  };
})();
