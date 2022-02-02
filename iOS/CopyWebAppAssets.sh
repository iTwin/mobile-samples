#! /bin/sh
set -e
AppBundleRoot="$BUILT_PRODUCTS_DIR/$FULL_PRODUCT_NAME"
if [ "$1" = "" ]; then
    WebAppDir=ITMApplication
else
    WebAppDir=$1
fi

reactAppDir=${PROJECT_DIR}/../../cross-platform/react-app
cd "${reactAppDir}"
./GenITMAppConfig.sh
cd -

[ -d "$AppBundleRoot/$WebAppDir/frontend" ] || mkdir -p "$AppBundleRoot/$WebAppDir/frontend"
[ -d "$AppBundleRoot/$WebAppDir/backend" ] || mkdir -p "$AppBundleRoot/$WebAppDir/backend"
rsync -aL --delete "${reactAppDir}/lib/webpack/" "$AppBundleRoot/$WebAppDir/backend/"

# Enable this if your react-app has any backend assets (e.g. custom element properties) 
rsync -aL --delete "${reactAppDir}/assets/" "$AppBundleRoot/$WebAppDir/backend/assets/"

# must be done after rsync above
[ -d "$AppBundleRoot/$WebAppDir/backend/assets" ] || mkdir -p "$AppBundleRoot/$WebAppDir/backend/assets"
rsync -aL --delete "${reactAppDir}/node_modules/@itwin/presentation-common/lib/cjs/assets/locales/" "$AppBundleRoot/$WebAppDir/backend/assets/locales/"
rsync -aL --delete "${reactAppDir}/node_modules/@itwin/presentation-backend/lib/cjs/assets/supplemental-presentation-rules/" "$AppBundleRoot/$WebAppDir/backend/assets/supplemental_presentation_rules/"

rsync -aL "${reactAppDir}/ITMAppConfig.json" "$AppBundleRoot/$WebAppDir/"
# if [ -f "${reactAppDir}/ITMAppConfig.json" ]; then
if [ grep -q baseUrl "${reactAppDir}/ITMAppConfig.json" ]; then
    rm -rf "$AppBundleRoot/$WebAppDir/frontend"
else
    rsync -aL --delete "${reactAppDir}/build/" "$AppBundleRoot/$WebAppDir/frontend/"
fi
