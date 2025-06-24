#! /bin/sh
set -e
AppBundleRoot="$BUILT_PRODUCTS_DIR/$FULL_PRODUCT_NAME"
if [ "$1" = "" ]; then
    WebAppDir=ITMApplication
else
    WebAppDir=$1
fi

if [ "$#" -eq 2 ] && [ -d "$2" ]; then
    reactAppDir="$2"
else
    reactAppDir=${PROJECT_DIR}/../../cross-platform/react-app
fi
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
rsync -aL "${reactAppDir}/node_modules/@itwin/core-backend/lib/cjs/assets/" "$AppBundleRoot/$WebAppDir/backend/assets/"
# rsync -aL --delete "${reactAppDir}/node_modules/@itwin/presentation-common/lib/cjs/assets/locales/" "$AppBundleRoot/$WebAppDir/backend/assets/locales/"

rsync -aL "${reactAppDir}/ITMAppConfig.json" "$AppBundleRoot/$WebAppDir/"
if grep -q ITMAPPLICATION_BASE_URL "${reactAppDir}/ITMAppConfig.json"; then
    rm -rf "$AppBundleRoot/$WebAppDir/frontend"
else
    rsync -aL --delete "${reactAppDir}/build/" "$AppBundleRoot/$WebAppDir/frontend/"
    rsync -aL --delete "${reactAppDir}/.static-assets/" "$AppBundleRoot/$WebAppDir/frontend/.static-assets/"
fi
