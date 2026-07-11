const PARTS = [
  "hero-clean.0.hex",
  "hero-clean.1.hex",
  "hero-clean.2.hex",
  "hero-sharp.3a.hex",
  "hero-sharp.3b.hex",
  "hero-sharp.4a.hex",
  "hero-sharp.4b.hex",
  "hero-sharp.5a.hex",
  "hero-sharp.5b.hex",
];

let builtHero;

async function buildHero(request, env) {
  if (!builtHero) {
    builtHero = (async () => {
      if (!env.ASSETS) throw new Error("Static asset binding unavailable");

      const origin = new URL(request.url).origin;
      const chunks = await Promise.all(
        PARTS.map(async (name) => {
          const assetUrl = new URL(`/assets/${name}`, origin);
          const response = await env.ASSETS.fetch(new Request(assetUrl));
          if (!response.ok) throw new Error(`Missing hero source: ${name}`);

          const text = (await response.text()).trim();
          if (!text || !/^[0-9a-f]+$/i.test(text)) {
            throw new Error(`Invalid hero source: ${name}`);
          }
          return text;
        }),
      );

      const hex = chunks.join("");
      if (hex.length % 2 !== 0) throw new Error("Odd-length hero data");

      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      }

      if (
        String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" ||
        String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP"
      ) {
        throw new Error("Invalid hero WebP");
      }

      return bytes;
    })();
  }

  return builtHero;
}

export async function onRequestGet({ request, env }) {
  try {
    const bytes = await buildHero(request, env);
    return new Response(bytes, {
      headers: {
        "content-type": "image/webp",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response(`Hero image unavailable: ${error.message}`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
}
