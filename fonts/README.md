# Self-hosted typography

These WOFF2 assets preserve the site's existing **Inter**, **Playfair Display**, and **IBM Plex Mono** families, normal style, requested weights, Unicode subsets, and `font-display: swap`. System fallbacks remain defined in `src/index.css`.

Vendored on 6 October 2026 from the `@fontsource/inter`, `@fontsource/playfair-display`, and `@fontsource/ibm-plex-mono` npm packages, version **5.3.0**. Their font revisions match the former Google stylesheet: **Inter v20**, **Playfair Display v40**, **IBM Plex Mono v20**. Fontsource is an alternate distribution; the font binaries are not claimed to be byte-identical to Google's variable-font response.

Only the previously requested normal weights are included: Inter 300/400/500/600/700; Playfair Display 400/500/600/700; IBM Plex Mono 400/500/600. Each font is licensed under **SIL Open Font License 1.1**, with the full upstream notice in its accompanying `*-OFL.txt` file. Typeface names and font contents are unchanged. WOFF fallbacks were omitted because this application already targets browsers supporting WOFF2 and native dialog.

`manifest.json` records package tarballs, revisions, subsets, file sizes and SHA-256 hashes. `fonts.css` retains the package Unicode ranges and limits network requests to the weights/subsets the page needs.

The external Google stylesheet and font requests were removed after intermittent HTTP 503 failures made page loading and verification unreliable. Fonts now load from the same static deployment and require no third-party font service at runtime.

## Investigation workspace supplement

The October 14, 2026 investigation workspace adds the actual italic Playfair Display face: `playfair-display-latin-wght-italic.woff2`, from `@fontsource-variable/playfair-display` 5.3.0, weights 400–900 under the same SIL Open Font License. Its italic-only `@font-face` declaration lives in `src/index.css`; the normal faces remain declared solely in `fonts.css` above. The package license is retained alongside the files.

The merged repository also retains `inter-latin-wght-normal.woff2` and `playfair-display-latin-wght-normal.woff2` from the initial investigation build. These variable normal faces are not registered, so they do not compete with the published static normal faces or cause additional font requests. The shared IBM Plex Mono Latin files are used by `fonts.css`.
