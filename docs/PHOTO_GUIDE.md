# How to replace illustrations with actual movie photos

This project ships with 120 **original visual clue SVG images**, one for each film, so that all questions work without internet. These are original symbolic illustrations, not screenshots or official posters.

For a movie's real photo/still or suitably licensed/authorized publicity art:

1. Obtain an image you have permission to use. Prefer photos you created, openly licensed images meeting license requirements, or material your school has cleared.
2. Put the JPG/PNG/WebP file into `assets/posters/` (example `assets/posters/h-3-idiots.jpg`).
3. In `js/data.js`, find the movie object (`id: "h-3-idiots"`) and add `"poster": "assets/posters/h-3-idiots.jpg"` within the object.
4. Refresh `index.html`. The image replaces the symbolic SVG for that question.
5. Cite the image's creator/source/license in `docs/IMAGE_CREDITS.md` if appropriate.
6. Avoid images with the movie title printed on them because that spoils the answer. Crop or choose a still without the title.

Image sizes: prefer landscape 900 × 610 or greater. The game uses `object-fit: cover`, so images adapt to cards.

Do not paste a random Google Images URL without permission; many images are copyrighted and may stop loading.
