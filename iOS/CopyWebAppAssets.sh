#! /bin/sh
set -e
AppBundleRoot="$BUILT_PRODUCTS_DIR/$FULL_PRODUCT_NAME"
if [ "$1" = "" ]; then
    WebAppDir=ITMApplication
else
    WebAppDir=$1
fi

[ -d "$AppBundleRoot/$WebAppDir/react-app" ] || mkdir -p "$AppBundleRoot/$WebAppDir/react-app"
[ -d "$AppBundleRoot/$WebAppDir/backend" ] || mkdir -p "$AppBundleRoot/$WebAppDir/backend"
rsync -aL --delete "${PROJECT_DIR}/react-app/lib/webpack/" "$AppBundleRoot/$WebAppDir/backend/"

# Enable this if your react-app has any backend assets (e.g. custom element properties) 
#rsync -aL --delete "${PROJECT_DIR}/react-app/assets/" "$AppBundleRoot/$WebAppDir/backend/assets/"

# must be done after rsync above
[ -d "$AppBundleRoot/$WebAppDir/backend/assets" ] || mkdir -p "$AppBundleRoot/$WebAppDir/backend/assets"
rsync -aL --delete "${PROJECT_DIR}/react-app/node_modules/@bentley/presentation-common/lib/assets/locales/" "$AppBundleRoot/$WebAppDir/backend/assets/locales/"
rsync -aL --delete "${PROJECT_DIR}/react-app/node_modules/@bentley/presentation-backend/lib/assets/supplemental-presentation-rules/" "$AppBundleRoot/$WebAppDir/backend/assets/supplemental_presentation_rules/"

if [ -f "${PROJECT_DIR}/react-app/ITMAppConfig.json" ]; then
    rsync -aL "${PROJECT_DIR}/react-app/ITMAppConfig.json" "$AppBundleRoot/$WebAppDir/"
    rm -rf "$AppBundleRoot/$WebAppDir/react-app"
else
    rsync -aL --delete "${PROJECT_DIR}/react-app/build/" "$AppBundleRoot/$WebAppDir/react-app/"
    rm -f "$AppBundleRoot/$WebAppDir/ITMAppConfig.json"
fi
