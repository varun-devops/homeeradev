# Helvetica Now

The site is set in **Helvetica Now Light**. It is a licensed Monotype
typeface, so the font files are deliberately not committed here — buying a
webfont licence is the only lawful way to serve them.

Until they are present the page falls back to Inter, then to the system
Helvetica, then Arial. That is a deliberate ordering, not an accident:
Inter is the closest free grotesque, so the site looks intentional rather
than broken while a licence is being sorted out.

## To switch the real font on

Drop the licensed `.woff2` files in this folder with exactly these names —
`src/styles/globals.css` already references them, so nothing else changes:

    HelveticaNowText-Light.woff2          (required — the body weight)
    HelveticaNowText-LightItalic.woff2    (optional)
    HelveticaNowText-Regular.woff2        (optional)
    HelveticaNowDisplay-Light.woff2       (optional — large card titles)

Only the first is needed. Any file that is absent simply falls through the
stack, so a partial set is fine.

Buy from https://www.monotype.com — a **web** licence, not desktop; a
desktop licence does not permit serving the file to browsers.

If you have OTF/TTF rather than WOFF2, convert them first: WOFF2 is roughly
half the size and is what every current browser prefers.
