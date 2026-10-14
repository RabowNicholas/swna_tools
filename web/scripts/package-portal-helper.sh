#!/bin/sh
# Zips the Chrome extension in ../extension into public/portal-helper.zip, the
# file Settings offers for download. Rerun after any change to the extension,
# and bump its version in extension/manifest.json and HELPER_VERSION in
# src/lib/portal/helper.ts together.
set -e
cd "$(dirname "$0")/../.."
rm -f web/public/portal-helper.zip
(cd extension && zip -q -r ../web/public/portal-helper.zip . -x '.*')
echo "Wrote web/public/portal-helper.zip"
