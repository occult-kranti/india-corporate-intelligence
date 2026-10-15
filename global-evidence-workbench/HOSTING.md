# Hosting and integration

The public application is built at `/india-corporate-intelligence/global-workbench/` by the existing India `npm run build` and gated Pages deployment. Ordinary links connect it to India and ProtestAtlas; no route is replaced, no new cross-dataset identity joins are inferred, and no live data synchronization is claimed.

This source package was imported from the reviewed October 14 delivery ZIP. The original `DELIVERY_MANIFEST.json` remains the receipt for that delivery, not a checksum of hosting/navigation/accessibility edits. Generated `ui/dist` is rebuilt instead of committed. The original README's no-publication statement describes the pre-hosting delivery. Current hosting is documented here.

The canonical dataset is `ui/public/data/dataset.json`, byte-identical to `integration/staging/dataset-round4.json`. Reproduce with `python3 assemble_round4.py` from `integration/`; review and validate any changed sources before replacing the canonical UI dataset. Do not use the legacy baseline assemblers to overwrite it. Counts: 237 records, 150 typed relations, 305 sources, 11 document-change cases.

Run `npm ci` at repository root and `npm ci --prefix global-evidence-workbench/ui`, followed by `npm run test:global-workbench` and the repository's `npm run check`. Root build runs the standalone and static app builds. Deployment preserves existing repository gates.

No raw acquired PDFs/full text, credentials, private contact details or leaked archives are included. Source receipts, hashes, schema, provenance and the documented evidentiary limitations remain in the package. A pinned source snapshot does not refresh simply because either upstream site changes.
