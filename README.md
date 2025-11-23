# @neptune3d/icon-font

Library for creating icon fonts with composition.

[![NPM Version](https://img.shields.io/npm/v/%40neptune3d%2Ficon-font)](https://www.npmjs.com/package/@neptune3d/icon-font)

```bash
npm install neptune3d/icon-font
```

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
]).center({ maxX: 24, maxY: 19 }); // centered in the bounding box of the text file path

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
