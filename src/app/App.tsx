import { useCallback, useState } from "react";
import type { Lang } from "../content/translations";
import { ExperienceShell } from "./components/ExperienceShell";
import { Loader } from "./components/Loader";
import { useReducedMotion } from "./hooks/useReducedMotion";

/** Bengali is the default language. The story starts only once every asset is loaded and decoded. */
export const App = () => {
  const [lang, setLang] = useState<Lang>("bn");
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const reducedMotion = useReducedMotion();
  return ready ? <ExperienceShell lang={lang} onLangChange={setLang} reducedMotion={reducedMotion} /> : <Loader onReady={onReady} />;
};
