# photos/

Drop your original photos in this folder. That's it.

- **While `npm run dev` is running**, new, replaced or deleted photos show up on the site within a second or two.
- Otherwise run `npm run photos` (or just `npm run build`).

For each photo the script:

1. reads ISO, shutter speed, aperture, focal length (35mm-equivalent when available), exposure compensation, white balance, camera and date from the EXIF data;
2. fixes the rotation and makes a 1600px WebP for the lightbox plus a small grid thumbnail in `public/gallery/`, with **all metadata removed** (including GPS);
3. writes everything the site needs to `src/data/gallery.json`.

The gallery is sorted newest first, by the date the photo was taken.

**Formats:** JPEG, PNG, WebP, TIFF, AVIF. iPhone HEIC files need to be exported as JPEG first.

This folder is git-ignored (except this file) so your full-resolution originals, and their GPS
location, never get pushed. Commit `public/gallery/` and `src/data/gallery.json` instead.
