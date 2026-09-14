import { readFileSync } from "fs";
import { join } from "path";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/jpeg";

export default function Icon() {
  try {
    const logoPath = join(process.cwd(), "public", "logo.png");
    const logoBuffer = readFileSync(logoPath);
    return new Response(logoBuffer, {
      headers: {
        "Content-Type": "image/png",
      },
    });
  } catch (e) {
    // Fallback if logo not found
    return new Response(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "base64"
      ),
      {
        headers: {
          "Content-Type": "image/png",
        },
      }
    );
  }
}
