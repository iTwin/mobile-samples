#! /bin/zsh

function printUsage
{
    echo "usage: GenITMAppConfig.sh [--help] | [--delete | -d]"
    echo
    echo Run with no arguments to enable react-scripts debug server mode.
    echo Run with --delete or -d to disable react-scripts debug server mode.
}

if [ "${1}" = "--delete" -o "${1}" = "-d" ]; then
    rm -f "ITMAppConfig.json"
    echo "Remote Debugging disabled: TypeScript will compile and install on device."
    exit 0
fi
if [ "${1}" = "--help" ]; then
    printUsage
    exit 0
fi
if [ "${1}" != "" ]; then
    echo "ERROR: Unknown option: ${1}"
    printUsage
    exit 1
fi

# Generate a ITMAppConfig.json that will be used to indicate that ITMApplication
# will be developed using the react-scripts debug web server running locally on
# this computer, instead of being built and installed onto the device.
if [ "$REACT_SERVER_PORT" = "" ]; then
    # Look for a node process listening on TCP for incoming traffic from
    # anywhere on a specific port. If that is found, use that port number.
    port=`lsof -c node -a -i TCP | grep -o "TCP \*:[0-9]*" | cut -d: -f2`
    if [ "$port" = "" ]; then
        REACT_SERVER_PORT=3000
    else
        REACT_SERVER_PORT=$port
    fi
fi
appHost="$(hostname)"
if [ "$appHost" = "" ]; then
    echo "ERROR: hostname is blank."
    exit 1
fi
cat <<EOT > "ITMAppConfig.json"
{
  "baseUrl": "http://${appHost}:${REACT_SERVER_PORT}"
}
EOT
echo "Remote debugging enabled."
echo "Configured to connect to http://${appHost}:${REACT_SERVER_PORT}."
