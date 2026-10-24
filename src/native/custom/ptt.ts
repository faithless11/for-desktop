import { ipcMain } from "electron";

import { mainWindow } from "../window";

import {
  HookEvent,
  LabelLanguage,
  NativePttBinding,
  bindingFromHookEvent,
  keyNameMap,
  matches,
} from "./pttBindings";

/**
 * How long a key capture waits for input
 */
const RECORD_TIMEOUT_MS = 10_000;

type Hook = typeof import("uiohook-napi");

let hook: Hook | undefined;
let hookFailed = false;
let running = false;
let binding: NativePttBinding | null = null;
let pressed = false;
let recorder: ((event: HookEvent) => void) | undefined;
let cancelRecord: (() => void) | undefined;

/**
 * Load the native hook once; failures are remembered so the app keeps working
 */
async function loadHook(): Promise<Hook | undefined> {
  if (hook || hookFailed) return hook;
  try {
    hook = (await import("uiohook-napi")) as Hook;
    hook.uIOhook.on("keydown", (e) => onEvent({ type: "key", keycode: e.keycode }, true));
    hook.uIOhook.on("keyup", (e) => onEvent({ type: "key", keycode: e.keycode }, false));
    hook.uIOhook.on("mousedown", (e) =>
      onEvent({ type: "mouse", button: Number(e.button) }, true),
    );
    hook.uIOhook.on("mouseup", (e) =>
      onEvent({ type: "mouse", button: Number(e.button) }, false),
    );
  } catch (error) {
    console.error("[stoat-custom] global push-to-talk unavailable", error);
    hookFailed = true;
    hook = undefined;
  }
  return hook;
}

/**
 * Start or stop the hook depending on whether anyone needs it
 */
function updateRunning() {
  if (!hook) return;
  const needed = binding !== null || recorder !== undefined;
  try {
    if (needed && !running) {
      hook.uIOhook.start();
      running = true;
    } else if (!needed && running) {
      hook.uIOhook.stop();
      running = false;
    }
  } catch (error) {
    console.error("[stoat-custom] global push-to-talk hook failed", error);
    hookFailed = true;
    running = false;
  }
}

/**
 * Report a press/release of the bound key to the page
 */
function setPressed(value: boolean) {
  if (pressed === value) return;
  pressed = value;
  if (!mainWindow.isDestroyed()) mainWindow.webContents.send("ptt:state", value);
}

/**
 * Handle an input event from the hook. Only the bound key is ever reported.
 */
function onEvent(event: HookEvent, down: boolean) {
  if (down && recorder) {
    recorder(event);
    return;
  }
  if (binding && matches(binding, event)) setPressed(down);
}

/**
 * Capture the next key or mouse button press (a running capture is cancelled)
 */
async function record(lang: LabelLanguage): Promise<NativePttBinding | null> {
  cancelRecord?.();
  if (!(await loadHook())) return null;
  const names = keyNameMap(hook!.UiohookKey as Record<string, number>);
  return new Promise((resolve) => {
    const finish = (result: NativePttBinding | null) => {
      clearTimeout(timer);
      if (recorder === capture) recorder = undefined;
      if (cancelRecord === cancel) cancelRecord = undefined;
      updateRunning();
      resolve(result);
    };
    const capture = (event: HookEvent) => {
      // clicking around in the window must not end the capture
      if (event.type === "mouse" && (event.button === 1 || event.button === 2))
        return;
      // Escape yields null and cancels
      finish(bindingFromHookEvent(event, names, lang));
    };
    const cancel = () => finish(null);
    const timer = setTimeout(cancel, RECORD_TIMEOUT_MS);
    recorder = capture;
    cancelRecord = cancel;
    updateRunning();
  });
}

/**
 * Register the IPC handlers of the global push-to-talk bridge
 */
export function initPtt() {
  ipcMain.handle("ptt:available", async () => {
    const loaded = await loadHook();
    return !!loaded && !hookFailed;
  });

  ipcMain.handle("ptt:record", (_, lang: LabelLanguage) =>
    record(lang === "de" ? "de" : "en"),
  );

  ipcMain.on("ptt:listen", async (_, next: NativePttBinding | null) => {
    binding = next;
    setPressed(false);
    if (next) await loadHook();
    updateRunning();
  });
}

/**
 * Stop the hook (on quit)
 */
export function destroyPtt() {
  binding = null;
  cancelRecord?.();
  recorder = undefined;
  if (hook && running) {
    try {
      hook.uIOhook.stop();
    } catch {
      // ignore, the process is exiting anyway
    }
  }
  running = false;
}
