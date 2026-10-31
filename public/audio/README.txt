soundtrack.mp3 — the invitation's music.

Source:  supplied by the couple ("soundtrack.mp3", 2:04). Rights are the couple's responsibility.
Edit:    the first 50 seconds (a soft ~10 s intro, then the steady main section, ending where the original dips),
         a very short fade-in and a 2.5 s fade-out, re-encoded to 160 kbps MP3 so it matches the 50-second film and
         loads quickly on phones. The app fades and swells it further (src/remotion/Soundtrack.tsx).

This is the groom's film's track, kept for the bride's film at the family's request. The bride's film is about 53 s:
the track plays once, never looping, and the film is timed so the invitation card is complete as the track's own
fade-out ends; the last few seconds hold the card in quiet (src/app/lib/soundtrackVolume.ts TRACK_SECONDS,
src/app/hooks/useSoundtrack.ts, src/remotion/Soundtrack.tsx).

To use a different track, replace soundtrack.mp3, update TRACK_SECONDS and retime BEATS.invitation in
src/story/timeline.ts to its length, and restart `npm run dev` (its presence is detected when the server starts). Never
add music you do not have the rights to. If the file is removed, the experience plays silently.
