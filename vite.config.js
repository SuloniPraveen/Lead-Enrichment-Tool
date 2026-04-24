import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/news-proxy": {
        target: "https://newsapi.org/v2",
        changeOrigin: true,
        rewrite: (path) => {
          const i = path.indexOf("?");
          return "/everything" + (i === -1 ? "" : path.slice(i));
        },
      },
    },
  },
});
