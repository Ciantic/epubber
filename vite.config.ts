import { defineConfig, Plugin } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
    plugins: [
        solidPlugin(),
        {
            name: "html-csp",
            transform(src, id) {
                if (id.endsWith("index.html")) {
                    return {
                        code: src.replace(
                            "<!-- CSP -->",
                            `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; worker-src blob:;" />`
                        ),
                        map: null,
                    };
                }
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
