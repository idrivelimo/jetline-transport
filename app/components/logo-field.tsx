"use client";

import { useRef, useState } from "react";

import { MAX_LOGO_BYTES } from "@/app/lib/logo";

/**
 * Picks a logo and stores it in a hidden field as a PNG or JPEG data URL, the
 * formats the PDF can draw. Whatever the operator picks is redrawn on a canvas
 * at a size that prints sharp without bloating the saved document.
 */

// Printed at most ~180pt wide; this is several times that, so it stays crisp.
const MAX_WIDTH = 900;
const MAX_HEIGHT = 360;

const payloadBytes = (dataUrl: string) =>
  Math.ceil(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function toLogoDataUrl(file: File): Promise<string> {
  const img = await loadImage(file);
  // An SVG without its own dimensions reports 0; give it a working size.
  const width = img.naturalWidth || 600;
  const height = img.naturalHeight || 240;
  let scale = Math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height);

  for (let attempt = 0; attempt < 6; attempt++, scale *= 0.75) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // PNG first: it keeps a transparent background transparent.
    const png = canvas.toDataURL("image/png");
    if (payloadBytes(png) <= MAX_LOGO_BYTES) return png;

    // A photographic logo is far smaller as JPEG. JPEG has no transparency,
    // so paint the invoice's white paper in behind it first.
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const jpeg = canvas.toDataURL("image/jpeg", 0.9);
    if (payloadBytes(jpeg) <= MAX_LOGO_BYTES) return jpeg;
  }
  throw new Error("too large");
}

export function LogoField({
  initial,
  label,
  error,
}: {
  initial: string;
  label: string;
  error?: string;
}) {
  const [logo, setLogo] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function choose(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setProblem(null);
    try {
      setLogo(await toLogoDataUrl(file));
    } catch {
      setProblem("That file couldn't be used as a logo. Try a PNG or JPEG.");
    } finally {
      setBusy(false);
      // Lets the same file be picked again after a remove.
      if (input.current) input.current.value = "";
    }
  }

  const message = problem ?? error;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input type="hidden" name="logo" value={logo} />

      <div className="flex flex-wrap items-center gap-4">
        {/* White, like the invoice paper, so the preview is what prints. */}
        <div className="flex h-20 w-48 items-center justify-center border border-rule bg-white p-2">
          {logo ? (
            // A data URL: next/image has nothing to optimise here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[13px] text-slate">No logo</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <label
            className="cursor-pointer rounded-sm border border-rule bg-card px-3 py-1.5 text-sm text-ink
                       transition-colors hover:border-ink focus-within:border-brass"
          >
            {busy ? "Preparing" : logo ? "Replace" : "Choose image"}
            <input
              ref={input}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => choose(e.target.files?.[0])}
            />
          </label>
          {logo && (
            <button
              type="button"
              onClick={() => setLogo("")}
              className="text-sm text-slate underline-offset-2 hover:text-ink hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {message ? (
        <p role="alert" className="text-[13px] text-ink-soft">{message}</p>
      ) : (
        <p className="text-[13px] text-slate">
          Shown on white, as it prints. A logo on a transparent or white background
          looks best.
        </p>
      )}
    </div>
  );
}
