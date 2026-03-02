import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, "src/background/index.ts"),
      name: "background",
      formats: ["iife"],
      fileName: () => "background.js",
    },
    rollupOptions: {
      output: {
        entryFileNames: "background.js",
        extend: true,
      },
    },
  },
});
