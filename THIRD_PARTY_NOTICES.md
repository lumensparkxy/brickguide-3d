# Third-party notices and source boundaries

The root MIT license covers original Guide2Build code and documentation. It does not
relicense third-party software, fonts, official manuals, trademarks or downloaded geometry.

- **Three.js and other dependencies:** installed using the committed npm/Python lockfiles.
  Each dependency retains its upstream license. Three.js is MIT licensed:
  https://threejs.org/license/ . No `node_modules` or Python environment is distributed here.
- **Inter font:** `apps/web/public/fonts/landing-inter-latin.woff2` is distributed under
  the SIL Open Font License 1.1. The full copyright and license text is retained in
  [Inter-OFL.txt](apps/web/public/fonts/Inter-OFL.txt).
- **Individual LDraw parts:** fetched on demand, not bundled in this source repository.
  Preserve each downloaded file's author, license and dependency provenance; the MIT
  license does not replace them. The part fetcher checks supported redistribution notices.
  See https://www.ldraw.org/article/227.html and the actual downloaded file headers.
- **Official LEGO instructions:** PDFs, rendered pages and source crops are not distributed
  in this repository. Configurations contain source references and integrity hashes.
  Access to a source URL does not grant redistribution rights.
- **Decorative artwork:** generated for this project; provenance is documented in
  [the landing artwork record](apps/web/public/images/landing/PROVENANCE.md).
  The conceptual image in `docs/assets/` and landing illustrations are design references,
  not official instruction images or evidence of reconstruction correctness.
- **Authored reference data and synthetic fixtures:** identified in `config/` and
  `tests/fixtures/`. A reference is distinct from an automatic reconstruction. Synthetic
  fixtures do not represent physical-build verification.

Independent prototype. Not affiliated with or endorsed by the LEGO Group.
LEGO is a trademark of the LEGO Group. LDraw is a trademark of the Estate of James Jessiman.
