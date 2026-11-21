import { fnStr } from "../shared/string.js";
import { cardName, cardTypes, findBaseCards, findCards } from "./cards.js";
import { findDropdownComponent, wrapProvider } from "./component-resolvers.js";
import { createModuleInventoryScanner } from "./module-inventory.js";

const cardComponentNames = ["FeatureCard", "Hero", "CardImage", ...cardTypes.map(cardName)];
const LATE_COMPONENTS = ["Slider", "Dropdown", "Toggle", ...cardComponentNames.map((name) => `Cards.${name}`)];

function hasComponent(component) {
  return component.split(".").reduce((owner, key) => owner?.[key], Ghostify.ReactComponent) !== undefined;
}

function hasLateComponents() {
  return LATE_COMPONENTS.every(hasComponent);
}

export function waitForLateComponents({ require, refreshNavLinks }) {
  const inventory = createModuleInventoryScanner();

  (function waitForChunks(attempt = 0) {
    if (hasLateComponents()) return;

    const { chunks: newChunks, modules: newModules, functionModules: newFunctionModules } = inventory.scan(require);

    const cardInventory = { modules: newModules, functionModules: newFunctionModules };
    const remainingCardTypes = cardTypes.filter((type) => Ghostify.ReactComponent.Cards[cardName(type)] === undefined);
    const discoveredCards = {
      ...findBaseCards(cardInventory),
      ...Object.fromEntries(findCards(cardInventory, remainingCardTypes)),
    };
    for (const [name, component] of Object.entries(discoveredCards))
      if (Ghostify.ReactComponent.Cards[name] === undefined) Ghostify.ReactComponent.Cards[name] = component;

    if (!Ghostify.ReactComponent.Slider)
      Ghostify.ReactComponent.Slider = wrapProvider(newFunctionModules.find((m) => fnStr(m).includes("progressBarRef")));
    if (!Ghostify.ReactComponent.Toggle)
      Ghostify.ReactComponent.Toggle = newFunctionModules.find((m) => fnStr(m).includes("onSelected") && fnStr(m).includes('type:"checkbox"'));
    if (!Ghostify.ReactComponent.Dropdown)
      Ghostify.ReactComponent.Dropdown = findDropdownComponent({ modules: newModules, chunks: newChunks, require });
    if (!Ghostify.ReactComponent.Toggle) {
      const toggleChunk = newChunks.find(([, value]) => fnStr(value).includes("onSelected") && fnStr(value).includes('type:"checkbox"'));
      if (toggleChunk) {
        Ghostify.ReactComponent.Toggle = Object.values(require(toggleChunk[0]))[0].render;
      }
    }

    if (!hasLateComponents()) {
      setTimeout(() => waitForChunks(attempt + 1), Math.min(100 * 2 ** Math.min(attempt, 4), 1000));
      return;
    }

    if (Ghostify.ReactComponent.ScrollableContainer) setTimeout(() => refreshNavLinks?.(), 100);
  })();
}
