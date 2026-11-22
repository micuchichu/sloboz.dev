# acoustics/

Drop `.mid` files here and they show up in the Acoustics player. That's it.

- While `npm run dev` is running, new files appear after a refresh.
- Commit the `.mid` files; they're bundled into the site when it builds.

The player reads the notes, velocities, tempo and sustain pedal from the file
and plays them with a built-in piano synth (no audio files needed).

**Titles** come from the file name. Embers Piano names like
`Clip 2026-11-22 12-42.mid` are shown as "Clip — 22 Nov 2026" with the time,
and they're sorted newest first. Any other name is shown as-is, so rename a
file (e.g. `nocturne-sketch.mid`) to give it a proper title.
