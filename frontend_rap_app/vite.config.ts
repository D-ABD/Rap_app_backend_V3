import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_BACKEND_PROXY_TARGET || "http://127.0.0.1:8000";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        src: path.resolve(__dirname, "src"), // ✅ permet import "src/..."
      },
    },
    server: {
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/admin": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/static": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/media": {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      target: "esnext",
      commonjsOptions: {
        transformMixedEsModules: true,
        include: [/node_modules/],
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            if (id.includes("/recharts/") || id.includes("/d3-")) {
              return "vendor-charts";
            }

            if (
              id.includes("/tiptap/") ||
              id.includes("/@tiptap/") ||
              id.includes("/prosemirror/") ||
              id.includes("/quill/")
            ) {
              return "vendor-editor";
            }

            if (
              id.includes("/axios/") ||
              id.includes("/dayjs/") ||
              id.includes("/date-fns/") ||
              id.includes("/xlsx/") ||
              id.includes("/jspdf/") ||
              id.includes("/html2canvas/")
            ) {
              return "vendor-utils";
            }
          },
        },
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "esnext",
      },
    },
  };
});
