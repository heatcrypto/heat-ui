# https://fimkrypto.manuscript.com/f/cases/503/Building-desktop-wallets

# Windows machines in Virtual Box
# https://github.com/magnetikonline/linux-microsoft-ie-virtual-machines

# https://github.com/electron-userland/electron-osx-sign/wiki/Packaging-and-Submitting-an-Electron-App-to-the-Mac-App-Store
HEATLEDGER_SERVER_PROJECT_DIR=../heatledger
HEATLEDGER_SERVER_DIR=$HEATLEDGER_SERVER_PROJECT_DIR/build/install/heatledger
DEBUG=false
MACOS=false
TEST=false
COPYRIGHT="Copyright © 2021 HEAT DEX"
DIST_DIR=dist
RELEASE_DIR=releases
VERSION=`cat VERSION`
HEATLEDGER_VERSION=`cat $HEATLEDGER_SERVER_PROJECT_DIR/conf/VERSION`
NAME="heat"
BUILD=$(date '+%F %T')
BUILD_OVERRIDE_HEATLEDGER_VERSION_KEY="%BUILD_OVERRIDE_HEATLEDGER_VERSION%"
BUILD_OVERRIDE_VERSION_KEY="%BUILD_OVERRIDE_VERSION%"
BUILD_OVERRIDE_BUILD_KEY="%BUILD_OVERRIDE_BUILD%"
BUILD_OVERRIDE_LAST_MODIFIED="%BUILD_OVERRIDE_LAST_MODIFIED%"
NAME_APPEND=""
if [ "$TEST" = "true" ]; then
  NAME_APPEND=".TEST"
fi

WINDOWS_APP_NAME="dist/Heatwallet_Setup_$VERSION$NAME_APPEND.exe"
LINUX_ZIP_NAME="dist/Heatwallet_Linux_$VERSION$NAME_APPEND.zip"
DARWIN_ZIP_NAME="dist/Heatwallet_MacOS_$VERSION.EXPERIMENTAL$NAME_APPEND.zip"

WINDOWS_APP_CLIENT_NAME="dist/Heatclient_Setup_$VERSION$NAME_APPEND.exe"
LINUX_ZIP_CLIENT_NAME="dist/Heatclient_Linux_$VERSION$NAME_APPEND.zip"
DARWIN_ZIP_CLIENT_NAME="dist/Heatclient_MacOS_$VERSION.EXPERIMENTAL$NAME_APPEND.zip"

# build the app
rm -r -f $DIST_DIR
gulp build
gulp electron

BUILD_OVERRIDE_FILE=`find $DIST_DIR -iname 'heat-ui-*.js'`

# Windows client only REMOVE THIS !!!
#build the light windows client
#node_modules/.bin/build --win --x64 --c.extraResources=[]
#mv $RELEASE_DIR/*.exe $RELEASE_DIR/$WINDOWS_APP_CLIENT_NAME
#rm -f $RELEASE_DIR/*.exe
#rm -r -f $RELEASE_DIR/win-unpacked
#node_modules/.bin/build --linux --x64 --c.extraResources=[]
#mv $RELEASE_DIR/*.zip $RELEASE_DIR/$LINUX_ZIP_CLIENT_NAME
#rm -f $RELEASE_DIR/*.zip
#rm -r -f $RELEASE_DIR/linux-unpacked
#$SHELL
#exit
# Windows client only REMOVE THIS !!!

# copy heatledger server dir to dist dir
#cp -r $HEATLEDGER_SERVER_DIR $DIST_DIR

# update VERSION and BUILD
sed -i "s/${BUILD_OVERRIDE_HEATLEDGER_VERSION_KEY}/${HEATLEDGER_VERSION}/g" $BUILD_OVERRIDE_FILE
sed -i "s/${BUILD_OVERRIDE_VERSION_KEY}/${VERSION}/g" $BUILD_OVERRIDE_FILE
sed -i "s/${BUILD_OVERRIDE_VERSION_KEY}/${VERSION}/g" $DIST_DIR/index.html
sed -i "s/${BUILD_OVERRIDE_BUILD_KEY}/${BUILD}/g" $BUILD_OVERRIDE_FILE

#<meta http-equiv="Last-Modified" content="%BUILD_OVERRIDE_LAST_MODIFIED%">
DATE=`date`
sed -i "s/${BUILD_OVERRIDE_LAST_MODIFIED}/${DATE}/g" $DIST_DIR/index.html

/bin/rm -r -f $RELEASE_DIR && mkdir -p $RELEASE_DIR/dist


# mainnet custom properties file
#rm -f $HEATLEDGER_SERVER_DIR/conf/heat.properties
#echo "heat.blockchainDir=ENV[HEAT_WALLET_BLOCKCHAINDIR]" >> $HEATLEDGER_SERVER_DIR/conf/heat.properties
#echo "heat.testBlockchainDir=ENV[HEAT_WALLET_BLOCKCHAINDIR_TEST]" >> $HEATLEDGER_SERVER_DIR/conf/heat.properties
#echo "heat.apiKeyDisabled=true" >> $HEATLEDGER_SERVER_DIR/conf/heat.properties
#echo "heat.ANSIEscapeSequencesAllowed=false" >> $HEATLEDGER_SERVER_DIR/conf/heat.properties
#echo "heat.replicatorEnabled=true" >> $HEATLEDGER_SERVER_DIR/conf/heat.properties
#echo "heat.virtualOrdersEnabled=true" >> $HEATLEDGER_SERVER_DIR/conf/heat.properties
#echo "heat.legacy.enableAPIServer=false" >> $HEATLEDGER_SERVER_DIR/conf/heat.properties

# testnet properties file
#cp $HEATLEDGER_SERVER_DIR/conf/heat.properties $HEATLEDGER_SERVER_DIR/conf/heat-testnet.properties
#echo "heat.replicatorJdbcUrlH2=jdbc:h2:ENV[HEAT_WALLET_DB_DIR_TEST];DB_CLOSE_ON_EXIT=FALSE;MVCC=TRUE;MODE=MySQL" >> $HEATLEDGER_SERVER_DIR/conf/heat-testnet.properties
#echo "heat.numberOfForkConfirmations=0" >> $HEATLEDGER_SERVER_DIR/conf/heat-testnet.properties
#echo "heat.isTestnet=true" >> $HEATLEDGER_SERVER_DIR/conf/heat-testnet.properties

#echo "heat.replicatorJdbcUrlH2=jdbc:h2:ENV[HEAT_WALLET_DB_DIR];DB_CLOSE_ON_EXIT=FALSE;MVCC=TRUE;MODE=MySQL" >> $HEATLEDGER_SERVER_DIR/conf/heat.properties



# linux
# to run `releases/heat-ui-linux-x64/heat-ui`
if [ "$DEBUG" = "true" ]; then

  # build the full windows client
  # node_modules/.bin/build --win --x64
  # mv $RELEASE_DIR/win/*.exe $RELEASE_DIR/$WINDOWS_APP_NAME
  # rm -r -f $RELEASE_DIR/win

  # # build the full linux client
  node_modules/.bin/build --linux --x64
  mv $RELEASE_DIR/*.zip $RELEASE_DIR/$LINUX_ZIP_NAME

  exit
fi

# macos
if [ "$MACOS" = "true" ]; then

  mkdir dist
  node_modules/.bin/build --macos --x64
  mv $RELEASE_DIR/*.zip $RELEASE_DIR/$DARWIN_ZIP_NAME

  $SHELL
  exit
fi

# build the full windows client
node_modules/.bin/electron-builder --win --x64
mv $RELEASE_DIR/*.exe $RELEASE_DIR/$WINDOWS_APP_NAME
rm -f $RELEASE_DIR/*.exe
rm -r -f $RELEASE_DIR/win-unpacked

# build the light windows client
node_modules/.bin/electron-builder --win --x64 --c.extraResources=[]
mv $RELEASE_DIR/*.exe $RELEASE_DIR/$WINDOWS_APP_CLIENT_NAME
rm -f $RELEASE_DIR/*.exe
rm -r -f $RELEASE_DIR/win-unpacked

# build the full linux client
node_modules/.bin/electron-builder --linux --x64
mv $RELEASE_DIR/*.zip $RELEASE_DIR/$LINUX_ZIP_NAME
rm -f $RELEASE_DIR/*.zip
rm -r -f $RELEASE_DIR/linux-unpacked

# build the light linux client
node_modules/.bin/electron-builder --linux --x64 --c.extraResources=[]
mv $RELEASE_DIR/*.zip $RELEASE_DIR/$LINUX_ZIP_CLIENT_NAME
rm -f $RELEASE_DIR/*.zip
rm -r -f $RELEASE_DIR/linux-unpacked

# darwin
# Experimental build - will be based on electron-builder in future versions.
#electron-packager $DIST_DIR --platform=darwin \
#  --arch=x64 $ARGS \
#  --icon="build/icon.icns" \
#  --app-category-type="public.app-category.finance" \
#  --copyright="$COPYRIGHT"
#  --asar-unpack=$DIST_DIR/heatledger"
#cp -r $HEATLEDGER_SERVER_DIR $RELEASE_DIR/heat-darwin-x64/heat.app/Contents/Resources
#cd $RELEASE_DIR/heat-darwin-x64
#zip -qr9 ../$DARWIN_ZIP_NAME .
#cd ../..
#rm -r -f $RELEASE_DIR/heat-darwin-x64

# prepare announcement
CHANGELOG="changelogs/heat-ui-$VERSION.txt"
ANNOUNCEMENT="$RELEASE_DIR/announcement-$VERSION.txt"
DATE=`date +%Y-%m-%d`

rm -f $ANNOUNCEMENT

# get checksums for artifacts
SHA_SUM_1=`sha256sum "$RELEASE_DIR/$WINDOWS_APP_NAME"`
MD5_SUM_1=`md5sum "$RELEASE_DIR/$WINDOWS_APP_NAME"`
SHA_SUM_1=${SHA_SUM_1%\ *}
MD5_SUM_1=${MD5_SUM_1%\ *}
SHA_SUM_2=`sha256sum "$RELEASE_DIR/$LINUX_ZIP_NAME"`
MD5_SUM_2=`md5sum "$RELEASE_DIR/$LINUX_ZIP_NAME"`
SHA_SUM_2=${SHA_SUM_2%\ *}
MD5_SUM_2=${MD5_SUM_2%\ *}
SHA_SUM_3=`sha256sum "$RELEASE_DIR/$DARWIN_ZIP_NAME"`
MD5_SUM_3=`md5sum "$RELEASE_DIR/$DARWIN_ZIP_NAME"`
SHA_SUM_3=${SHA_SUM_3%\ *}
MD5_SUM_3=${MD5_SUM_3%\ *}

# announcement text
BANNER=$(cat <<'END_HEREDOC'
Release #VERSION# | #DATE# | https://heatledger.com

██╗  ██╗███████╗ █████╗ ████████╗   ██╗   ██╗██╗
██║  ██║██╔════╝██╔══██╗╚══██╔══╝   ██║   ██║██║
███████║█████╗  ███████║   ██║█████╗██║   ██║██║
██╔══██║██╔══╝  ██╔══██║   ██║╚════╝██║   ██║██║
██║  ██║███████╗██║  ██║   ██║      ╚██████╔╝██║
╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝       ╚═════╝ ╚═╝
END_HEREDOC
)

cat > $ANNOUNCEMENT <<EOF
$BANNER

`cat $CHANGELOG`

---------------------------------- Downloads ----------------------------------

https://github.com/Heat-Ledger-Ltd/heat-ui/releases/download/v$VERSION/$WINDOWS_APP_NAME
SHA256 $SHA_SUM_1
MD5    $MD5_SUM_1

https://github.com/Heat-Ledger-Ltd/heat-ui/releases/download/v$VERSION/$LINUX_ZIP_NAME
SHA256 $SHA_SUM_2
MD5    $MD5_SUM_2

https://github.com/Heat-Ledger-Ltd/heat-ui/releases/download/v$VERSION/$DARWIN_ZIP_NAME
SHA256 $SHA_SUM_3
MD5    $MD5_SUM_3

EOF

orig=#VERSION#
sed -i "s/${orig}/${VERSION}/g" $ANNOUNCEMENT

orig=#DATE#
sed -i "s/${orig}/${DATE}/g" $ANNOUNCEMENT

if [ "$DEBUG" = "false" ]; then
  gpg --clearsign --local-user F0B09705 --batch $ANNOUNCEMENT
  mv $ANNOUNCEMENT.asc $ANNOUNCEMENT
fi

$SHELL
