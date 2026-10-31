import { t, type Lang } from "../../content/translations";

interface Props {
  lang: Lang;
  onChange: (lang: Lang) => void;
}

const OPTIONS: Lang[] = ["bn", "en"];

/** বাংলা | English. Changes only the text; the story keeps playing from the same frame. */
export const LanguageToggle = ({ lang, onChange }: Props) => (
  <div className="lang-toggle" role="group" aria-label={`${t("bn").switchLanguage} / ${t("en").switchLanguage}`}>
    {OPTIONS.map((l) => (
      <button
        key={l}
        type="button"
        className="lang-toggle__btn"
        lang={l}
        aria-pressed={lang === l}
        onClick={() => onChange(l)}
      >
        {t(l).languageName}
      </button>
    ))}
  </div>
);

