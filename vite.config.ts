import { defineConfig, Plugin, IndexHtmlTransform } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
    plugins: [
        solidPlugin(),
        {
            name: "html-csp",
            transformIndexHtml(html, ctx) {
                // On dev mode, allow also unsafe inline tags
                if (!ctx.bundle) {
                    return html.replace(
                        "default-src ",
                        "style-src 'unsafe-inline'; default-src wss: ws: "
                    );
                }
                return html;
            },
        } as Plugin,
    ],
    server: {
        host: "0.0.0.0",
        https: true,
    },
    base: "./",
    build: {
        target: "esnext",
        polyfillDynamicImport: false,
        outDir: "docs",
    },
});
