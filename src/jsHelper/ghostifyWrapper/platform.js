import { waitFor } from "./shared/async.js";

(function waitForPlatform() {
  if (!Ghostify._platform) {
    setTimeout(waitForPlatform, 50);
    return;
  }
  const { _platform } = Ghostify;
  for (const key of Object.keys(_platform)) {
    if (key.startsWith("get") && typeof _platform[key] === "function") {
      Ghostify.Platform[key.slice(3)] = _platform[key]();
    } else {
      Ghostify.Platform[key] = _platform[key];
    }
  }
})();

(function addMissingPlatformAPIs() {
  if (!Ghostify.Platform?.version && !Ghostify.Platform?.Registry) {
    setTimeout(addMissingPlatformAPIs, 50);
    return;
  }
  const os = Ghostify.Platform.operatingSystem;
  const version = Ghostify.Platform.version.split(".").map((i) => Number.parseInt(i, 10));
  if (version[0] === 1 && version[1] === 2 && version[2] < 38) return;

  for (const [key, _] of Ghostify.Platform.Registry._map.entries()) {
    if (typeof key?.description !== "string" || !key?.description.endsWith("API")) continue;
    const symbolName = key.description;
    if (symbolName === "ExclusiveModeAPI" && os === "Linux") continue;
    if (Object.hasOwn(Ghostify.Platform, symbolName)) continue;
    try {
      const resolvedAPI = Ghostify.Platform.Registry.resolve(key);
      Ghostify.Platform[symbolName] = resolvedAPI;

      console.debug(`[ghostifyWrapper] Resolved PlatformAPI from Registry: ${symbolName}`);
    } catch (err) {
      console.error(`[ghostifyWrapper] Error resolving PlatformAPI from Registry: ${symbolName}`, err);
    }
  }
})();

// Based on https://blog.aziz.tn/2025/01/spotify-fix-lagging-issue-on-scrolling.html
function applyScrollingFix() {
  if (!Ghostify.Platform?.version) {
    setTimeout(applyScrollingFix, 50);
    return;
  }

  // Run only for 1.2.56 and lower
  const version = Ghostify.Platform.version.split(".").map((i) => Number.parseInt(i, 10));
  if ((version[1] == 2 && version[2] >= 57) || version[1] > 2) return;

  const scrollableElements = Array.from(document.querySelectorAll("*:not([data-scroll-optimized])")).filter((el) => {
    if (
      el.id === "context-menu" ||
      el.closest("#context-menu") ||
      el.getAttribute("role") === "dialog" ||
      el.classList.contains("popup") ||
      el.getAttribute("aria-haspopup") === "true"
    )
      return false;

    const style = window.getComputedStyle(el);
    return style.overflow === "auto" || style.overflow === "scroll" || style.overflowY === "auto" || style.overflowY === "scroll";
  });

  for (const el of scrollableElements) {
    el.style.willChange = "transform";
    el.style.transform = "translate3d(0, 0, 0)";
    el.setAttribute("data-scroll-optimized", "true");
  }
}

let scrollingFixScheduled = false;
function scheduleScrollingFix() {
  if (scrollingFixScheduled) return;
  scrollingFixScheduled = true;
  queueMicrotask(() => {
    scrollingFixScheduled = false;
    applyScrollingFix();
  });
}

const observer = new MutationObserver(scheduleScrollingFix);

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false,
});

const originalPushState = history.pushState.bind(history);
history.pushState = function (...args) {
  originalPushState(...args);
  setTimeout(applyScrollingFix, 100);
};

window.addEventListener("popstate", () => {
  setTimeout(applyScrollingFix, 100);
});

applyScrollingFix();

void (async function addProxyCosmos() {
  if (!Ghostify.Player.origin?._cosmos && !Ghostify.Platform?.Registry) {
    setTimeout(addProxyCosmos, 50);
    return;
  }

  const _cosmos = Ghostify.Player.origin?._cosmos ?? Ghostify.Platform?.Registry.resolve(Symbol.for("Cosmos"));

  const allowedMethodsMap = {
    get: "get",
    post: "post",
    del: "delete",
    put: "put",
    patch: "patch",
  };
  const allowedMethodsSet = new Set(Object.keys(allowedMethodsMap));
  const internalEndpoints = new Set(["sp:", "wg:"]);

  const handler = {
    get: (target, prop, receiver) => {
      const internalFetch = Reflect.get(target, prop, receiver);

      if (typeof internalFetch !== "function" || !allowedMethodsSet.has(prop)) return internalFetch;
      const version = Ghostify.Platform.version.split(".").map((i) => Number.parseInt(i, 10));
      if (version[1] < 2 || (version[1] == 2 && version[2] < 31)) return internalFetch;

      return async function (url, body) {
        const urlObj = new URL(url);

        const corsProxyURLTemplate = window.localStorage.getItem("ghostify:corsProxyTemplate") ?? "https://cors-proxy.spicetify.app/{url}";
        const isWebAPI = urlObj.hostname === "api.spotify.com";
        const isSpClientAPI = urlObj.hostname.includes("spotify.com") && urlObj.hostname.includes("spclient");
        const isInternalURL = internalEndpoints.has(urlObj.protocol);
        if (isInternalURL) return internalFetch.apply(this, [url, body]);

        const shouldUseCORSProxy = !isWebAPI && !isSpClientAPI && !isInternalURL;

        const method = allowedMethodsMap[prop.toLowerCase()];
        const headers = {
          "Content-Type": "application/json",
        };

        const options = {
          method,
          headers,
          timeout: 1000 * 15,
        };

        let finalURL = urlObj.toString();
        if (body) {
          if (method === "get") {
            const params = new URLSearchParams(body);
            const useSeparator = shouldUseCORSProxy && new URL(finalURL).search.startsWith("?");
            finalURL += `${useSeparator ? "&" : "?"}${params.toString()}`;
          } else options.body = !Array.isArray(body) && typeof body === "object" ? JSON.stringify(body) : body;
        }
        if (shouldUseCORSProxy) {
          finalURL = corsProxyURLTemplate.replace(/{url}/, finalURL);
          try {
            new URL(finalURL);
          } catch {
            console.error("[ghostifyWrapper] Invalid CORS Proxy URL template");
          }
        }

        const Authorization = `Bearer ${Ghostify.Platform.AuthorizationAPI.getState().token.accessToken}`;
        let injectedHeaders = {};
        if (isWebAPI) injectedHeaders = { Authorization };
        if (isSpClientAPI) {
          injectedHeaders = {
            Authorization,
            "Spotify-App-Version": Ghostify.Platform.version,
            "App-Platform": Ghostify.Platform.PlatformData.app_platform,
          };
        }
        Object.assign(options.headers, injectedHeaders);

        try {
          return fetch(finalURL, options).then((res) => {
            if (!res.ok) return { code: res.status, error: res.statusText, message: "Failed to fetch", stack: undefined };
            try {
              return res.clone().json();
            } catch {
              try {
                return res.clone().blob();
              } catch {
                return res.clone().text();
              }
            }
          });
        } catch (e) {
          console.error(e);
        }
      };
    },
  };

  await waitFor(() => Ghostify.Player.origin, 50);
  Ghostify.Player.origin._cosmos = new Proxy(_cosmos, handler);
  Object.defineProperty(Ghostify, "CosmosAsync", {
    get: () => {
      return Ghostify.Player.origin?._cosmos;
    },
  });
})();
