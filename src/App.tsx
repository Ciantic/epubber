import { Component, createEffect, createSignal, Show } from "solid-js";

import * as zip from "@zip.js/zip.js";

/**
 * Converts relative path to absolute path
 *
 * @param relativePath e.g. `../images/foo.jpg`
 * @param currentPath e.g. `/OEPBS/zoo/file.html`
 * @returns `/OEPBS/images/foo.jpg`
 */
function absPath(relativePath: string, currentPath: string) {
    // TODO: This is pretty slow function
    const fullPath = new URL(relativePath, new URL(currentPath, "https://example.com"));
    return fullPath.pathname;
}

async function asText(z: zip.Entry) {
    return (await z.getData?.(new zip.TextWriter())) as string;
}

async function asBlob(z: zip.Entry) {
    return (await z?.getData?.(new zip.BlobWriter())) as string;
}

const openEpub = async (blob: Blob) => {
    const r = new zip.ZipReader(new zip.BlobReader(blob));
    const zipFileEntries = await r.getEntries();
    const zipFileMap = new Map(
        zipFileEntries.map((zipEntry) => ["/" + zipEntry.filename, zipEntry])
    );

    // Read the epub opf <item /> tags ( https://www.w3.org/publishing/epub3/epub-packages.html )
    const opfFiles = zipFileEntries.filter((f) => f.filename.endsWith(".opf"));
    if (opfFiles.length !== 1) {
        throw new Error("OPF confusion");
    }
    const opf = opfFiles[0];
    const opfContent: string = await opf.getData?.(new zip.TextWriter());
    const dp = new DOMParser();
    const opfXml = dp.parseFromString(opfContent, "text/xml");
    const items = [...opfXml.querySelectorAll("manifest item")];
    const titles = [...opfXml.querySelectorAll("title")].map((f) => f.textContent || "");
    console.log("opf", opfContent);
    // const identifiers = [...opfXml.querySelectorAll("identifier")].map((f) => f.textContent || "");

    // Get corresponding ZIP file entries for the opf <item /> tags
    const htmlFiles = items
        // Filter by the media type stored in <item media-type="" />
        .filter((f) => f.getAttribute("media-type")?.match(/html/))
        // Get the filename stored in <item href="" />
        .map((f) => f.getAttribute("href") || "✅")
        // Get ZIP Entry by the filename
        .map((f) => {
            // When the files are in same directory as the OPF
            const m = zipFileMap.get(absPath(f, opf.filename));
            if (m) {
                return m;
            }

            // Sometimes ebook files are in OEBPS directory
            const m2 = zipFileMap.get(absPath(f, "/OEBPS/"));
            if (m2) {
                return m2;
            }

            // Or OPS directory
            const m3 = zipFileMap.get(absPath(f, "/OPS/"));
            if (m3) {
                return m3;
            }

            // Some ebooks omit the directory entirely
            const m4 = zipFileMap.get(absPath(f, "/"));
            if (m4) {
                return m4;
            }
        })
        // Makes sure the file is found from zip
        .filter((f) => f) as zip.Entry[];

    if (htmlFiles.length === 0) {
        console.error("OPF", opfContent, "OPF Items:", items, "ZIP File entries:", [
            ...zipFileMap.keys(),
        ]);
        throw new Error("No HTML Files found from the ebook");
    }

    // Read the HTML files as text
    const htmlContents = await Promise.all(
        htmlFiles.map(async (f) => {
            return {
                content: await asText(f),
                filename: f.filename,
            };
        })
    );

    // Parse the HTML files as html
    const documents = htmlContents.map(({ content, filename }) => {
        // DOMParser injects the error to a node, because hey, throwing error
        // would be inconvinient? See
        // https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString
        let doc = new DOMParser().parseFromString(content, "application/xhtml+xml");
        const errnode = doc.querySelector("parsererror");
        const resources = {} as { [k: string]: () => Promise<Blob> };
        if (errnode) {
            // Malformed XML can be usually read with text/html parser which is
            // rather lenient
            doc = new DOMParser().parseFromString(content, "text/html");
        }

        // TODO: Maybe loop over all elements instead of selecting them?

        // Replace all link targets with # and move href to data
        doc.querySelectorAll("[href]").forEach((e) => {
            if (e instanceof HTMLElement) {
                e.dataset["href"] = absPath(e.getAttribute("href") || "", filename);
                e.setAttribute("href", "#");
            }
        });

        // Make images lazy loadable, by moving src to data-src
        doc.querySelectorAll("[src]").forEach((e) => {
            if (e instanceof HTMLElement) {
                e.dataset["src"] = absPath(e.getAttribute("src") || "", filename);
                e.removeAttribute("src");
            }
        });

        // Lazy load SVG images
        [...doc.getElementsByTagNameNS("http://www.w3.org/2000/svg", "image")].forEach((e) => {
            if (e instanceof SVGImageElement) {
                const file = e.getAttributeNS("http://www.w3.org/1999/xlink", "href");
                e.dataset["href"] = absPath(file || "", filename);
                e.removeAttributeNS("http://www.w3.org/1999/xlink", "href");
            }
        });

        // Remove style, hr, other decorative tags
        doc.querySelectorAll("style, hr, [aria-hidden]").forEach((e) => {
            e.remove();
        });

        // Remove inline styles (they are against the CSP)
        doc.querySelectorAll("[style]").forEach((e) => {
            e.removeAttribute("style");
        });

        // Where we go, we don't need classes either
        doc.querySelectorAll("[class]").forEach((e) => {
            e.removeAttribute("class");
        });

        // Some epubs are full of useless divs, sections, articles, we just
        // flatten those
        //
        // TODO: This seems to work, but it might not be exactly what I want
        doc.querySelectorAll("section,article,div").forEach((e) => {
            if (!e.id) {
                e.replaceWith(...e.childNodes);
            } else {
                const div = doc.createElement("div");
                div.id = e.id;
                div.append(...e.childNodes);
                e.replaceWith(div);
            }
        });

        // This is some master plan by epub authors, plenty of H1's followed
        // immediately by another H1.
        doc.querySelectorAll("h1 + h1").forEach((e) => {
            const h1 = e.previousElementSibling;
            if (h1 instanceof HTMLHeadingElement) {
                h1.append(doc.createElement("br"), doc.createTextNode(" "));
                h1.append(...e.childNodes);
                e.remove();
            }
        });

        // Remove all empty elements
        // TODO: This breaks the empty table cells
        // doc.querySelectorAll("*:not(hr)").forEach((e) => {
        //     if (!e.hasChildNodes() && !e.id) {
        //         e.remove();
        //     }
        // });

        // Return doc
        return doc;
    });

    return { documents, zipFileMap, titles };
};

// TODO: Is this lazy loading thing even useful? Should I just read all
// resources to blobs during open epub?

async function loadImage(img: HTMLImageElement, fileMap: Map<string, zip.Entry>) {
    if (img.hasAttribute("src")) {
        return;
    }

    const zipFile = fileMap.get(img.dataset["src"] || "");
    if (!zipFile) {
        console.error("Cant find file", img.dataset["src"]);
        return;
    }
    const blob = await asBlob(zipFile);
    img.onload = () => {
        if (img.naturalWidth < 300 && img.naturalHeight < 300) {
            img.classList.add("small");
        }
    };

    img.src = URL.createObjectURL(new File([blob], zipFile.filename));
}

async function loadSvgImage(img: SVGImageElement, fileMap: Map<string, zip.Entry>) {
    if (img.hasAttributeNS("http://www.w3.org/1999/xlink", "href")) {
        return;
    }

    const zipFile = fileMap.get(img.dataset["href"] || "");
    if (!zipFile) {
        console.error("Cant find file", img.dataset["href"]);
        return;
    }
    const blob = await asBlob(zipFile);

    img.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "xlink:href",
        URL.createObjectURL(new File([blob], zipFile.filename))
    );
}

const App: Component = () => {
    let inputFileEl: HTMLInputElement | undefined;
    const [err, setErr] = createSignal("");
    const [titles, setTitles] = createSignal([] as string[]);
    const [documents, setDocuments] = createSignal([] as Document[]);
    const [fileMap, setFileMap] = createSignal(new Map() as Map<string, zip.Entry>);
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            const target = entry.target;
            if (!entry.isIntersecting) {
                continue;
            }
            if (target instanceof HTMLImageElement) {
                loadImage(target, fileMap());
            }
            if (target instanceof SVGElement) {
                [...target.getElementsByTagName("image")].forEach((img) => {
                    loadSvgImage(img, fileMap());
                });
            }
        }
    });

    function loadAllResources() {
        document.querySelectorAll("img").forEach((img) => {
            loadImage(img, fileMap());
        });

        [...document.getElementsByTagName("image")].forEach((img) => {
            loadSvgImage(img, fileMap());
        });
    }

    // When pages are created
    function onMountPagesEl(el: HTMLDivElement) {
        window.addEventListener("beforeprint", () => {
            loadAllResources();
        });

        setTimeout(() => {
            el.querySelectorAll("img").forEach((img) => {
                observer.observe(img);
            });
            el.querySelectorAll("svg").forEach((svg) => observer.observe(svg));
        });
    }

    async function selectFile() {
        if (!inputFileEl) {
            return;
        }

        const file = inputFileEl.files?.[0];
        if (file) {
            const { documents, zipFileMap, titles } = await openEpub(file);
            setDocuments(documents);
            setFileMap(zipFileMap);
            setTitles(titles);
        }
    }

    async function selectUrl(url: string) {
        try {
            const f = await fetch(url, {
                mode: "no-cors",
                redirect: "follow",
            });
            const blob = await f.blob();
            console.log("f", f, blob);
            const { documents, zipFileMap, titles } = await openEpub(blob);
            setDocuments(documents);
            setFileMap(zipFileMap);
            setTitles(titles);
        } catch (err) {
            if (err instanceof TypeError) {
                setErr(err.name + ": " + err.message);
            } else {
                setErr("Unable to fetch");
            }
        }
    }

    function FileSelector() {
        return (
            <div>
                <h1>Concats all the epub HTML files</h1>
                <h2>Select epub file</h2>
                <input type="file" ref={inputFileEl} name="" onInput={selectFile} />
                <h2>Or type fetchable URL</h2>
                <input
                    value="https://github.com/IDPF/epub3-samples/releases/download/20170606/moby-dick.epub"
                    type="text"
                    size="80"
                    placeholder="URL"
                />{" "}
                <button
                    type="button"
                    onClick={(e) => {
                        if (e.target.previousElementSibling instanceof HTMLInputElement) {
                            selectUrl(e.target.previousElementSibling.value);
                        }
                    }}
                >
                    Fetch
                </button>
                <br />
                {err()}
            </div>
        );
    }

    return (
        <div>
            <Show when={documents().length > 0} fallback={() => <FileSelector />}>
                <div ref={onMountPagesEl}>
                    <h1 class="book-title">
                        {titles().map((f, i) => (
                            <div class={`line${i}`}>{f}</div>
                        ))}
                    </h1>
                    {documents().map((d) => (
                        <section class="html-page" innerHTML={d.body.outerHTML}></section>
                    ))}
                </div>
            </Show>
        </div>
    );
};

export default App;
