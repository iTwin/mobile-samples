#! /bin/zsh

function printUsage {
    echo "usage: GenITMAppConfig.sh [--help] | [--release | -r]"
    echo
    echo Run with no arguments to enable react-scripts debug server mode.
    echo Run with --release or -r to disable react-scripts debug server mode.
}

function extractVariables {
env | egrep "^${1}" | sort | while read envVariable; do
  echo "  , \"$(echo ${envVariable} | cut -d = -f 1)\": \"$(echo ${envVariable} | cut -d = -f 2-)\"" >> "ITMAppConfig.json"
done
}

if [ "${1}" = "--release" -o "${1}" = "-r" -o "${ITMAPPLICATION_NO_DEBUG_SERVER}" = "YES" ]; then
    ReleaseMode=YES
elif [ "${1}" = "--help" ]; then
    printUsage
    exit 0
elif [ "${1}" != "" ]; then
    echo "ERROR: Unknown option: ${1}"
    printUsage
    exit 1
fi

# Generate a ITMAppConfig.json that will be used to provide the clientId to
# the ITMApplication, and also optionally indicate that ITMApplication
# will be developed using the react-scripts debug web server running locally on
# this computer, instead of being built and installed onto the device.
if [ "${ITMAPPLICATION_CLIENT_ID}" = "" ]; then
    echo You must set the ITMAPPLICATION_CLIENT_ID environment variable.
    echo This goes into iOSSamples.xcconfig, used by the iOS sample Xcode projects.
    exit 1
fi
if [ "${ReleaseMode}" != "YES" ]; then
    if [ "$REACT_SERVER_PORT" = "" ]; then
        # Look for a node process listening on TCP for incoming traffic from
        # anywhere on a specific port. If that is found, use that port number.
        port=$(lsof -c node -a -i TCP | grep -o "TCP \*:[0-9]*" | cut -d: -f2)
        if [ "$port" = "" ]; then
            REACT_SERVER_PORT=3000
        else
            REACT_SERVER_PORT=$port
        fi
    fi
    if [ "$ITMAPPLICATION_USE_IP" = "YES" ]; then
        if [ "$ITMAPPLICATION_SERVER_DEVICE" = "" ]; then
            ITMAPPLICATION_SERVER_DEVICE=en0
        fi
        appHost="$(ipconfig getifaddr ${ITMAPPLICATION_SERVER_DEVICE})"
        if [ "$appHost" = "" ]; then
            echo "ERROR: Device ${ITMAPPLICATION_SERVER_DEVICE} is not configured."
            echo "Please set the ITMAPPLICATION_SERVER_DEVICE environment variable to the name of your"
            echo "configured device. You can run \'networksetup -listallhardwareports\' to get a"
            echo "list of all devices."
            exit 1
        fi
    else
        appHost="$(hostname)"
        if [ "$ITMAPPLICATION_ADD_DOT_LOCAL" = "YES" ]; then
            appHost="${appHost}.local"
        fi
    fi
    if [ "$appHost" = "" ]; then
        echo "ERROR: hostname is blank."
        exit 1
    fi
    export ITMAPPLICATION_BASE_URL=http://${appHost}:${REACT_SERVER_PORT}
fi
cat <<EOT > "ITMAppConfig.json"
{
  "Version": "1.0"
EOT
extractVariables ITMAPPLICATION_
extractVariables ITMSAMPLE_
echo "}" >> "ITMAppConfig.json"
if [ "${ReleaseMode}" = "YES" ]; then
    echo "Remote debugging disabled."
else
    echo "Remote debugging enabled."
    echo "Configured to connect to http://${appHost}:${REACT_SERVER_PORT}."
fi
