import { useEffect, useState, type ReactNode } from "react";
import { continueRender, delayRender } from "remotion";
import "./fonts";

export const FONT_FACES = [
  '400 48px "Anek Bangla Variable"',
  '500 48px "Anek Bangla Variable"',
  '600 48px "Anek Bangla Variable"',
  '400 48px "Galada"',
  '400 48px "Cormorant Garamond"',
  'italic 400 48px "Cormorant Garamond"',
  '500 48px "Cormorant Garamond"',
  '600 48px "Cormorant Garamond"',
];
export const FONT_SAMPLE = "তিতাস ও দীপ শুভ পরিণয় সাদর আমন্ত্রণ ০১২৩৪৫৬৭৮৯ Titas & Deep You Are Invited";

/** Holds rendering until the webfonts are ready, so every rendered frame uses the real typefaces. */
export const FontGate = ({ children }: { children: ReactNode }) => {
  const [handle] = useState(() => delayRender("Loading fonts", { timeoutInMilliseconds: 30000 }));
  useEffect(() => {
    Promise.all(FONT_FACES.map((f) => document.fonts.load(f, FONT_SAMPLE)))
      .then(() => document.fonts.ready)
      .catch((err) => {
        // Fonts are decorative: fall back to the system face rather than failing a render outright.
        console.warn("Font loading failed", err);
      })
      .finally(() => continueRender(handle));
  }, [handle]);
  return <>{children}</>;
};
