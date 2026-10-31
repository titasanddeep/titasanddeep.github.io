import { BEATS, SCENE_BEATS } from "../../story/timeline";

/**
 * Length of public/audio/soundtrack.mp3 (the groom's film's 50 s cut). The film is timed so the card is complete when
 * it ends (BEATS.invitation.flourish), and the last seconds hold the finished card in quiet.
 */
export const TRACK_SECONDS = 50;

const W = SCENE_BEATS.wedding;
const END = SCENE_BEATS.invitation.end;
const AT = [0, 75, SCENE_BEATS.holud.end, W.start + BEATS.wedding.piriIn[0], W.start + BEATS.wedding.gaze[0], W.start + BEATS.wedding.exchange[1], W.end + 20, END - 100, END - 0.5];
const VOL = [0, 0.5, 0.56, 0.62, 0.88, 0.9, 0.6, 0.5, 0];

/**
 * Volume envelope as a pure function of the beat: a gentle fade-in under the names, a swell from the পিঁড়ি through
 * the first look and the garlands, a soft resolve and a fade-out over the card's final seconds. Linear between stops,
 * clamped. (The track itself ends, with its own fade, as the card settles: see BEATS.invitation.flourish.)
 */
export const soundtrackVolume = (beat: number): number => {
  if (beat <= AT[0]) return VOL[0];
  for (let i = 1; i < AT.length; i++) {
    if (beat <= AT[i]) return VOL[i - 1] + ((VOL[i] - VOL[i - 1]) * (beat - AT[i - 1])) / (AT[i] - AT[i - 1]);
  }
  return VOL[VOL.length - 1];
};

/**
 * Where in the track a story time falls. The track (the groom's film's, 50 s) plays once from the start of the story
 * and ends a little before it (as the card settles), so later story times stay at its end: it never loops.
 * @param seconds story time
 * @param duration the track's length, or a non-finite value while it is unknown
 */
export const trackTime = (seconds: number, duration: number): number =>
  Number.isFinite(duration) && duration > 0 ? Math.min(Math.max(0, seconds), duration) : Math.max(0, seconds);
