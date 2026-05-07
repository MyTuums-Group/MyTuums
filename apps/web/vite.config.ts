import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@workspace/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
      "@workspace/db": path.resolve(__dirname, "../../packages/db/src/index.ts"),
      "@workspace/api-contract": path.resolve(__dirname, "../../packages/api-contract/src/index.ts"),
    },
  },
})
