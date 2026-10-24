import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { bindingFromHookEvent, keyNameMap, matches } from "./pttBindings.ts";

// excerpt of uiohook-napi's UiohookKey (name → keycode)
const KEYS = { Escape: 1, A: 30, V: 47, Alt: 56, AltRight: 3640, F13: 91 };
const names = keyNameMap(KEYS);

describe("bindingFromHookEvent", () => {
  test("key gets its name as label", () => {
    assert.deepEqual(
      bindingFromHookEvent({ type: "key", keycode: 47 }, names, "en"),
      { kind: "key", keycode: 47, label: "V" },
    );
    assert.equal(
      bindingFromHookEvent({ type: "key", keycode: 56 }, names, "de")?.label,
      "Alt",
    );
  });

  test("unknown key gets a numeric label", () => {
    assert.equal(
      bindingFromHookEvent({ type: "key", keycode: 9999 }, names, "en")?.label,
      "Key 9999",
    );
  });

  test("Escape is rejected (cancels)", () => {
    assert.equal(
      bindingFromHookEvent({ type: "key", keycode: 1 }, names, "en"),
      null,
    );
  });

  test("left and right click are rejected", () => {
    assert.equal(
      bindingFromHookEvent({ type: "mouse", button: 1 }, names, "en"),
      null,
    );
    assert.equal(
      bindingFromHookEvent({ type: "mouse", button: 2 }, names, "en"),
      null,
    );
  });

  test("mouse labels", () => {
    const label = (button: number, lang: "en" | "de") =>
      bindingFromHookEvent({ type: "mouse", button }, names, lang)?.label;
    assert.equal(label(3, "en"), "Middle mouse");
    assert.equal(label(3, "de"), "Mittlere Maustaste");
    assert.equal(label(4, "en"), "Mouse 4");
    assert.equal(label(5, "de"), "Maus 5");
  });
});

describe("matches", () => {
  const key = { kind: "key", keycode: 4, label: "x" } as const;
  const mouse = { kind: "mouse", button: 4, label: "Mouse 4" } as const;

  test("key binding matches only key events with that code", () => {
    assert.equal(matches(key, { type: "key", keycode: 4 }), true);
    assert.equal(matches(key, { type: "key", keycode: 5 }), false);
    assert.equal(matches(key, { type: "mouse", button: 4 }), false);
  });

  test("mouse binding matches only mouse events with that button", () => {
    assert.equal(matches(mouse, { type: "mouse", button: 4 }), true);
    assert.equal(matches(mouse, { type: "key", keycode: 4 }), false);
  });
});
