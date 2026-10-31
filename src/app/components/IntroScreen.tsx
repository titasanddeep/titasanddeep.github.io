
import { formatDate } from "../../content/dates";
import { otherLang, t, type Lang } from "../../content/translations";
import { wedding } from "../../content/wedding";

interface Props {
  lang: Lang;
  onWatch: (e: React.SyntheticEvent) => void;
  onExplore: (e: React.SyntheticEvent) => void;
  onSkip: () => void;
}

const PlayIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** The lotus medallion of the invitation, as a static mark. */
const Emblem = () => (
  <svg className="cover__emblem" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">
    <circle r="92" fill="#781f2b" stroke="#c49a52" strokeWidth="6" />
    <circle r="78" fill="none" stroke="#c49a52" strokeWidth="2.4" strokeDasharray="1 10" strokeLinecap="round" />
    <g transform="translate(0 34)" fill="#e9c97a" stroke="#8f6c2a" strokeWidth="1.6">
      {[-62, -36, 36, 62, -14, 14, 0].map((a) => (
        <path key={a} d="M0 0C14 -18 14 -50 0 -72C-14 -50 -14 -18 0 0Z" transform={`rotate(${a})`} />
      ))}
    </g>
    <path d="M-40 40Q0 52 40 40" stroke="#e9c97a" strokeWidth="3" fill="none" />
  </svg>
);

/** One corner flourish; mirrored into the four corners by CSS. */
const Corner = ({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) => (
  <svg className={`cover__corner cover__corner--${pos}`} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <path d="M14 70A56 56 0 0 1 70 14" stroke="#c49a52" strokeWidth="3" fill="none" />
    <path d="M14 48A34 34 0 0 1 48 14" stroke="#781f2b" strokeWidth="2.4" fill="none" />
    <path d="M14 100C14 62 40 36 76 32C98 30 108 44 100 56C94 64 82 62 84 52" stroke="#c49a52" strokeWidth="2.6" fill="none" />
    <path d="M100 14C62 14 36 40 32 76C30 98 44 108 56 100C64 94 62 82 52 84" stroke="#c49a52" strokeWidth="2.6" fill="none" />
    <circle cx="26" cy="26" r="7" fill="#781f2b" stroke="#c49a52" strokeWidth="2.6" />
  </svg>
);

/**
 * The cover: a framed title page over the painted opening frame. "Watch the Story" is always the main action
 * (reduced motion only changes how the story plays, never which button leads); exploring is secondary and skipping
 * straight to the invitation is a quiet text link.
 */
export const IntroScreen = ({ lang, onWatch, onExplore, onSkip }: Props) => {
  const tx = t(lang);
  const alt = t(otherLang(lang));
  const date = formatDate(wedding.events.wedding.date, lang);
  return (
    <section className="cover" aria-label={tx.title}>
      <div className="cover__frame" aria-hidden="true">
        <Corner pos="tl" />
        <Corner pos="tr" />
        <Corner pos="bl" />
        <Corner pos="br" />
      </div>

      <div className="cover__head" lang={lang}>
        <Emblem />
        <p className="cover__kicker">{tx.coverKicker}</p>
        <h1 className="cover__names">{tx.title}</h1>
        <div className="cover__rule" aria-hidden="true">
          <span />
          <i />
          <span />
        </div>
        <p className="cover__subtitle">{tx.subtitle}</p>
        {date && <p className="cover__date">{date.day}</p>}
      </div>

      <div className="cover__actions">
        <button type="button" className="btn btn--primary" onClick={onWatch}>
          <span className="btn__icon">
            <PlayIcon />
          </span>
          <span className="btn__label">
            <span lang={lang}>{tx.play}</span>
            <small lang={otherLang(lang)}>{alt.play}</small>
          </span>
        </button>
        <button type="button" className="btn btn--ghost" onClick={onExplore}>
          <span className="btn__label">
            <span lang={lang}>{tx.explore}</span>
            <small lang={otherLang(lang)}>{alt.explore}</small>
          </span>
        </button>
        <button type="button" className="link-btn" onClick={onSkip} lang={lang}>
          {tx.skip}
          <ArrowIcon />
        </button>
      </div>
    </section>
  );
};

