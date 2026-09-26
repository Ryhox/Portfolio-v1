// Bakes the web copy of the iPod (public/models/ipod.glb) from the Sketchfab download:
//   npm run ipod -- path/to/ipod_classic.glb
// "iPod Classic" by Timothy Ahene, CC BY 4.0 (credited in the footer).
//
// The baked screen goes (the page draws a live one over the glass, see components/ipod), so does the
// see-through glass (no transmission pass needed), and the 2K textures become 1K WebP.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRMaterialsTransmission } from "@gltf-transform/extensions";
import { dedup, prune, textureCompress } from "@gltf-transform/functions";
import sharp from "sharp";

const src = process.argv[2];
if (!src) {
  console.error("usage: npm run ipod -- path/to/ipod_classic.glb");
  process.exit(1);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(src);
const root = doc.getRoot();

for (const node of root.listNodes()) if (node.getName() === "Screen_low") node.dispose();

for (const mat of root.listMaterials()) {
  mat.setExtension("KHR_materials_transmission", null);
  mat.setAlphaMode("OPAQUE");
  // The only thing the emissive map lit up was the baked screen.
  mat.setEmissiveTexture(null);
  mat.setEmissiveFactor([0, 0, 0]);
}
root.listExtensionsUsed().find((e) => e instanceof KHRMaterialsTransmission)?.dispose();

await doc.transform(prune(), dedup(), textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024], quality: 88 }));
await io.write("public/models/ipod.glb", doc);
console.log("wrote public/models/ipod.glb");
