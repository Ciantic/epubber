import { Component, createSignal, Show } from "solid-js";

import * as zip from "@zip.js/zip.js";

const openEpub = async (blob: Blob) => {
    const r = new zip.ZipReader(new zip.BlobReader(blob));
    const zipFileEntries = await r.getEntries();

    // Read the epub opf <item /> tags
    const opfFiles = zipFileEntries.filter((f) => f.filename.endsWith(".opf"));
    if (opfFiles.length !== 1) {
        throw new Error("OPF confusion");
    }
    const opf = opfFiles[0];
    const opfContent = await opf.getData?.(new zip.TextWriter());
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
        .map(
            (f) =>
                zipFileEntries.filter((entry) => {
                    if (entry.filename.endsWith(`/${f}`)) {
                        // In a directory
                        return true;
                    } else if (entry.filename === f) {
                        // In a root
                        return true;
                    }
                    return false;
                })[0]
        )
        // Makes sure the file is found from zip
        .filter((f) => f);

    // Read the HTML files as text
    const htmlContents = await Promise.all(htmlFiles.map((f) => f.getData?.(new zip.TextWriter())));

    // Parse the HTML files as html, and return just the body nodes
    const htmlBodyNodes = htmlContents.map((f) => {
        // DOMParser injects the error to a node, because hey, throwing
        // error would be inconvinient? See https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString
        let d = new DOMParser().parseFromString(f, "application/xhtml+xml");
        const errnode = d.querySelector("parsererror");
        if (errnode) {
            // Malformed XML can be usually read with text/html parser which is
            // rather lenient
            d = new DOMParser().parseFromString(f, "text/html");
        }

        // Replace all link targets with # and linkTarget
        d.querySelectorAll("a").forEach((e) => {
            if (e.hasAttribute("href")) {
                e.href = "#" + e.href;
            }
        });

        // Return nodes
        return d.body.childNodes;
    });

    // Merge all html files to one document
    const mergedDocument = document.implementation.createDocument(null, "html");
    const mergedHtml = mergedDocument.createElement("html");
    const mergedHead = mergedDocument.createElement("head");
    const mergedBody = mergedDocument.createElement("body");
    const cssFile = document.querySelector("link[rel='stylesheet']");
    const style = document.querySelector("style");
    if (cssFile) {
        mergedHead.appendChild(cssFile.cloneNode(true));
    } else if (style) {
        mergedHead.appendChild(style.cloneNode(true));
    }
    htmlBodyNodes.forEach((nodes) => {
        const div = mergedDocument.createElement("div");
        div.classList.add("html-page");
        div.append(...nodes);
        mergedBody.appendChild(div);
    });
    mergedHtml.appendChild(mergedHead);
    mergedHtml.appendChild(mergedBody);
    mergedDocument.documentElement.append(mergedHtml);

    // Return the HTML of the merged document
    return mergedDocument.documentElement.outerHTML;
};

const App: Component = () => {
    let inputFileEl: HTMLInputElement | undefined;
    const [err, setErr] = createSignal("");
    const [docHtml, setDochtml] = createSignal("");

    async function selectFile() {
        if (!inputFileEl) {
            return;
        }

        const file = inputFileEl.files?.[0];
        if (file) {
            const merged = await openEpub(file);
            setDochtml(merged);
        }
    }

    async function selectUrl(url: string) {
        try {
            const f = await fetch(url);
            const merged = await openEpub(await f.blob());
            setDochtml(merged);
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
                <h1>Concats all the epub HTML files and shows in the sandboxed iframe</h1>
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

    return (
        <div>
            <Show when={docHtml()} fallback={() => <FileSelector />}>
                <iframe class="sandbox" sandbox="" srcdoc={docHtml()}></iframe>
            </Show>
        </div>
    );
};

export default App;
