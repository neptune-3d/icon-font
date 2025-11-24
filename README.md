# @neptune3d/icon-font

Library for creating icon fonts with composition.

[![NPM Version](https://img.shields.io/npm/v/%40neptune3d%2Ficon-font)](https://www.npmjs.com/package/@neptune3d/icon-font)

```bash
npm install @neptune3d/icon-font
```

> ℹ️ Note: When installing you might get an error like this: `error: install script from "ttf2woff2" exited with 1` - should be fine, if not, just try running install again.

## Example

```ts
import { IconPath, IconGlyph, IconFont } from "@neptune3d/icon-font";

// all of the paths are in a 24x24 design space ( which is the default )

// a filled file path with a dog ear in the top right corner
const textFilePath = new IconPath(24).rect({
  x: 0,
  y: 0,
  width: 24,
  height: 19,
  corners: {
    tr: { kind: "chamfer", rx: 6, ry: 6 },
  },
});

// a template path for a text line - a basic rectangle with sharp corners
const textLinePath = new IconPath().rect({ x: 0, y: 0, width: 15, height: 2 });

// three text line paths merged into one IconPath
// one below the other
const textLinesPath = IconPath.merge([
  textLinePath.clone().translate(4, 8),
  textLinePath.clone().translate(4, 12),
  textLinePath.clone().translate(4, 16),
]).center(0, 0, 24, 19); // centered in the bounding box of the text file path

// create the font
const myIconFont = new IconFont({
  familyName: "myIcons",
  prefix: "mi", // css class prefix
  icons: [
    new IconGlyph({
      name: "text-file",
      unicode: 0xe001, // first unicode in the PUA ( Private Use Area )
      path: IconPath.merge([textFilePath, textLinesPath]).center(),
    }),
  ],
});

// write woff2 and css files
await Promise.all([
  writeFile(`../public/${myIconFont.familyName}.woff2`, myIconFont.toWoff2()),
  writeFile(
    "../src/icons.css",
    myIconFont.toCss(`/${myIconFont.familyName}.woff2`)
  ),
]);

// use the icon
import "./icons.css";

<div class="mi mi-text-file" style="font-size: 24px; color: #fff;"></div>;
```

## Browser support

When using this library in the browser with `vite` ( e.g. for previewing the font in the canvas ), you might get a console error like this:

```
Uncaught sync fetching of the wasm failed: you can preload it to Module["wasmBinary"] manually, or emcc.py will do that for you when generating HTML (but not JS)
```

The error comes from the `ttf2woff2` dependency of this package and you solve it by stubbing out the ttf2woff2 module:

```ts
// create a stub file src/ttf2woff2-stub.js:
export default {};

// and have these fields in the vite config:
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      ttf2woff2: "./src/ttf2woff2-stub.js",
    },
  },
  optimizeDeps: {
    force: true,
    include: ["@neptune3d/icon-font"],
  },
});
```

Of course, this means you won't be able to use the `ttf2woff2` features ( `IconFont.toWoff2()` ) in the browser, but you probably don't need it in the browser anyway.
