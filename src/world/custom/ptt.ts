import { contextBridge, ipcRenderer } from "electron";

/**
 * Global push-to-talk bridge for the web app (`window.nativePtt`, version 1).
 * Only reports press/release of the bound key, never other input.
 */
contextBridge.exposeInMainWorld("nativePtt", {
  version: 1,

  available: () => ipcRenderer.invoke("ptt:available") as Promise<boolean>,

  record: (lang?: "en" | "de") => ipcRenderer.invoke("ptt:record", lang),

  listen: (binding: unknown) => ipcRenderer.send("ptt:listen", binding),

  onState: (cb: (pressed: boolean) => void) => {
    const listener = (_: unknown, pressed: boolean) => cb(pressed);
    ipcRenderer.on("ptt:state", listener);
    return () => {
      ipcRenderer.removeListener("ptt:state", listener);
    };
  },
});
