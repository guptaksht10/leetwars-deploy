import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filesToStrip = [
  path.join(__dirname, "dist", "frontendAuthScript.js"),
  path.join(__dirname, "dist", "contentScript.js"),
  path.join(__dirname, "dist", "intercept.js")
];

for (const file of filesToStrip) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, "utf8");
    // Remove "export {};" at the end of the file
    content = content.replace(/export\s*\{\s*\}\s*;/g, "");
    fs.writeFileSync(file, content, "utf8");
    console.log(`Stripped export {} from ${path.basename(file)}`);
  }
}
