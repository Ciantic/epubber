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
                        "worker-src blob:;",
                        "worker-src blob:; style-src 'unsafe-inline';"
                    );
                }
                return html;
            },
        } as Plugin,
    ],
    base: "./",
    build: {
        target: "esnext",
        polyfillDynamicImport: false,
        outDir: "docs",
    },
});
