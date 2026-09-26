import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    fs: {
      // Preserve Vite's default private-file rules and exclude local execution evidence.
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem,key,p12,pfx,cer,der}",
        ".npmrc",
        ".yarnrc.yml",
        "**/.git/**",
        "**/.scratch/**",
      ],
    },
  },
  build: { assetsInlineLimit: 0 },
});
