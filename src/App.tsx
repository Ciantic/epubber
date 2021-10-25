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

const openEpub = async (blob: Blob) => {
    const r = new zip.ZipReader(new zip.BlobReader(blob));
    const zipFileEntries = await r.getEntries();
    const zipFileMap = new Map(
        zipFileEntries.map((zipEntry) => ["/" + zipEntry.filename, zipEntry])
    );

    // Read the epub opf <item /> tags
    const opfFiles = zipFileEntries.filter((f) => f.filename.endsWith(".opf"));
    if (opfFiles.length !== 1) {
        throw new Error("OPF confusion");
    }
    const opf = opfFiles[0];
    const opfContent: string = await opf.getData?.(new zip.TextWriter());
    const dp = new DOMParser();
    const opfXml = dp.parseFromString(opfContent, "text/xml");
    const items = [...opfXml.querySelectorAll("manifest item")];

    // Get corresponding ZIP file entries for the opf <item /> tags
    const htmlFiles = items
        // Filter by the media type stored in <item media-type="" />
        .filter((f) => f.getAttribute("media-type")?.match(/html/))
        // Get the filename stored in <item href="" />
        .map((f) => f.getAttribute("href") || "✅")
        // Get ZIP Entry by the filename
        .map((f) => {
            // Usually ebook files are in oebps directory
            const match1 = zipFileMap.get(absPath(f, "/OEBPS/"));
            if (match1) {
                return match1;
            }

            // Some ebooks omit the OEPBS directory
            const match2 = zipFileMap.get(absPath(f, "/"));
            if (match2) {
                return match2;
            }
        })
        // Makes sure the file is found from zip
        .filter((f) => f) as zip.Entry[];

    if (htmlFiles.length === 0) {
        console.error("OPF Items:", items, "ZIP File entries:", zipFileEntries.keys());
        throw new Error("No HTML Files found from the ebook");
    }

    // Read the HTML files as text
    const htmlContents = await Promise.all(
        htmlFiles.map(async (f) => {
            return {
                content: (await f.getData?.(new zip.TextWriter())) as string,
                filename: f.filename,
            };
        })
    );

    // Parse the HTML files as html
    const documents = htmlContents.map(({ content, filename }) => {
        // DOMParser injects the error to a node, because hey, throwing
        // error would be inconvinient? See https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString
        let doc = new DOMParser().parseFromString(content, "application/xhtml+xml");
        const errnode = doc.querySelector("parsererror");
        const resources = {} as { [k: string]: () => Promise<Blob> };
        if (errnode) {
            // Malformed XML can be usually read with text/html parser which is
            // rather lenient
            doc = new DOMParser().parseFromString(content, "text/html");
        }

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

        // Remove style tags (they are against the CSP)
        doc.querySelectorAll("style").forEach((e) => {
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

        // If it's not accessible, it's most likely some decoration we don't want
        doc.querySelectorAll("[aria-hidden]").forEach((e) => {
            if (e.ariaHidden) {
                e.remove();
            }
        });

        // Some epubs are full of useless divs, we just flatten those
        // TODO: This seems to work, but it might not be exactly what I want
        doc.querySelectorAll("div").forEach((e) => {
            if (!e.id) {
                e.replaceWith(...e.childNodes);
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

    return { documents, zipFileMap };

    // // Merge all html files to one document
    // const mergedDocument = document.implementation.createDocument(null, "html");
    // const mergedHtml = mergedDocument.createElement("html");
    // const mergedHead = mergedDocument.createElement("head");
    // const mergedBody = mergedDocument.createElement("body");
    // htmlBodyNodes.forEach((nodes) => {
    //     const div = mergedDocument.createElement("div");
    //     div.classList.add("html-page");
    //     div.append(...nodes);
    //     mergedBody.appendChild(div);
    // });
    // mergedHtml.appendChild(mergedHead);
    // mergedHtml.appendChild(mergedBody);
    // mergedDocument.documentElement.append(mergedHtml);

    // // Return the HTML of the merged document
    // return mergedDocument.documentElement.outerHTML;
};

const App: Component = () => {
    let inputFileEl: HTMLInputElement | undefined;
    const [err, setErr] = createSignal("");
    const [documents, setDocuments] = createSignal([] as Document[]);
    const [fileMap, setFileMap] = createSignal(new Map() as Map<string, zip.Entry>);
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.target instanceof HTMLImageElement) {
                const img = entry.target;

                // Lazy load the image as blob
                if (entry.isIntersecting && !img.hasAttribute("src")) {
                    const zipFile = fileMap().get(img.dataset["src"] || "");
                    if (zipFile) {
                        (async () => {
                            const blob: Blob = await zipFile.getData?.(new zip.BlobWriter());
                            if (blob instanceof Blob) {
                                img.src = URL.createObjectURL(new File([blob], zipFile.filename));
                            }
                        })();
                    }
                }
            }
        }
    });

    function onMountPagesEl(el: HTMLDivElement) {
        setTimeout(() => {
            el.querySelectorAll("img").forEach((img) => {
                observer.observe(img);
            });
        });
    }

    async function selectFile() {
        if (!inputFileEl) {
            return;
        }

        const file = inputFileEl.files?.[0];
        if (file) {
            const { documents, zipFileMap } = await openEpub(file);
            setDocuments(documents);
            setFileMap(zipFileMap);
        }
    }

    async function selectUrl(url: string) {
        try {
            const f = await fetch(url);
            const { documents, zipFileMap } = await openEpub(await f.blob());
            setDocuments(documents);
            setFileMap(zipFileMap);
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
                <input type="text" placeholder="URL" />{" "}
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

    function PagesEl() {}

    return (
        <div>
            <Show when={documents().length > 0} fallback={() => <FileSelector />}>
                <div ref={onMountPagesEl}>
                    {documents().map((d) => (
                        <div class="html-page" innerHTML={d.body.outerHTML}></div>
                    ))}
                </div>
            </Show>
        </div>
    );
};

export default App;
