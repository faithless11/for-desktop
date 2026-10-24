import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      // stoat-custom: uiohook-napi (global push-to-talk) is native as well
      external: ["node-pipewire", "uiohook-napi"],
    },
  },
});
