import fs from "fs";
import path from "path";
import os from "os";

// Base64 embedded TTF fonts for 100% guaranteed serverless Resvg font loading
import { CINZEL_BOLD_TTF_B64, CINZEL_REGULAR_TTF_B64, INTER_SEMIBOLD_TTF_B64 } from "./og-fonts-data";

export function ensureServerFonts(): string[] {
  const tmpDir = os.tmpdir() || "/tmp";
  const fonts = [
    { name: "Cinzel-Bold.ttf", b64: CINZEL_BOLD_TTF_B64 },
    { name: "Cinzel-Regular.ttf", b64: CINZEL_REGULAR_TTF_B64 },
    { name: "Inter-SemiBold.ttf", b64: INTER_SEMIBOLD_TTF_B64 },
  ];

  const fontFiles: string[] = [];

  for (const f of fonts) {
    const filePath = path.join(tmpDir, f.name);
    try {
      if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
        fs.writeFileSync(filePath, Buffer.from(f.b64, "base64"));
      }
      fontFiles.push(filePath);
    } catch (err) {
      console.warn(`Failed to write font ${f.name} to ${filePath}:`, err);
    }
  }

  return fontFiles;
}
