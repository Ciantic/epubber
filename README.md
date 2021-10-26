# epubber

[Try here ⤴](https://ciantic.github.io/epubber/)

## Notes

-   OPF file is known as the Package document and is defined in [EPUB Packages 3.2](https://www.w3.org/publishing/epub3/epub-packages.html)
-   Package document has metadata section that is defined in [3.4.3 Metadata](https://www.w3.org/publishing/epub3/epub-packages.html#sec-pkg-metadata), this includes the title, language and identifier.
-   Package document's manifest section `<item />` tags which denotes individual HTML files, as well as other resources. Some resources have additionally an attribute `properties`, e.g. `properties="cover-image"`, full list of values is defined in [Manifest Properties Vocabulary](https://www.w3.org/publishing/epub3/epub-packages.html#app-item-properties-vocab).
-   Package document `<guide />` along with `<reference />` is deprecated in favor of `epub:type` attributes. However I've noticed many epub files contain guide section for backwards compatibility.
-   `epub:type` is an attribute which is scattered in the content of HTML files. It is defined in [EPUB Content Documents 3.2](https://www.w3.org/publishing/epub3/epub-contentdocs.html#sec-epub-type-attribute) but `epub:type` values are available in [EPUB Structural Semantics Vocabulary](https://idpf.github.io/epub-vocabs/structure/).
-   Apple has an [helpful document about their iBook support](https://help.apple.com/itc/booksassetguide/en.lproj/static.html). It includes an specialty `epub:type` value `ibooks:reader-start-page` nav item which denotes the starting page.
-   Example EPUBS: https://github.com/IDPF/epub3-samples/releases
    -   https://github.com/IDPF/epub3-samples/releases/download/20170606/moby-dick.epub
