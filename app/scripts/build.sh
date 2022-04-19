#!/bin/bash

set -o pipefail

readonly __DIRNAME__="$( cd "${BASH_SOURCE[0]%/*}" && pwd )"
readonly REPO_ROOT_DIR="$(dirname "${__DIRNAME__}")"

PLATFORM=$1
MODE=$2
TARGET=$3
RUN_DEVICE=false

displayHelp() {
	echo ''
	echo "Usage: $0 {platform} ${--device}" >&2
	echo ''
	echo "Platform is required. Can be android or ios"
	echo ''
	echo "Mode is required. Can be debug or release"
	echo ''
	echo "Target is optional and valid for iOS only"
	echo ''
	echo "examples: $0 ios debug"
	echo ''
	echo "          $0 ios debug --device"
	echo ''
	echo "          $0 android debug"
	echo ''
	echo "          $0 android release"
	echo ''
	exit 1
}

printTitle() {
	echo ''
	echo '-------------------------------------------'
	echo ''
	echo "  🚀 BUILDING $PLATFORM in $MODE mode $TARGET" | tr [a-z] [A-Z]
	echo ''
	echo '-------------------------------------------'
	echo ''
}


printError() {
	ERROR_ICON=$'\342\235\214'
	echo ''
	echo "  $ERROR_ICON   $1"
	echo ''
}

checkParameters() {
	if [ "$#" -eq  "0" ]
	then
		printError 'Platform is a required parameter'
		displayHelp
		exit 0;
	elif [ "$1"  == "--help" ]
	then
		displayHelp
		exit 0;
	elif [ "$1" == "-h" ]
	then
		displayHelp
		exit 0;
	elif [ -z "$1" ]
	then
		displayHelp
		exit 0;
	elif [ -z "$1" ]
	then
		printError 'No platform supplied'
		displayHelp
		exit 0;
	fi

	if [[ $# -gt 2 ]] ; then
		if [ "$3"  == "--device" ] ; then
			RUN_DEVICE=true

		   if [ "$#" -gt  "3" ] ; then
				printError "Incorrect number of arguments"
				displayHelp
				exit 0;
			fi
		else
			printError "Unknown argument: $4"
			displayHelp
			exit 0;
		fi
	fi
}

prebuild_android() {
	yes | cp -rf app/core/InpageBridgeWeb3.js android/app/src/main/assets/.
	yes | cp -rf app/core/InpageVConsole.js android/app/src/main/assets/.
	yes | cp -rf app/components/UI/TradingViewKline/advanced.html android/app/src/main/assets/.
}

build_core() {
	cd ./../core
	yarn build
	rsync -rcv ./dist/ ./../app/node_modules/gopocket-core/dist/
	cd ./../app
}

build_thread_android() {
	node node_modules/react-native/local-cli/cli.js bundle --dev false --assets-dest ./android/app/src/main/res/ --entry-file NativeWorker.js --platform android --bundle-output ./android/app/src/main/assets/threads/NativeWorker.bundle
}

build_thread_ios() {
	node node_modules/react-native/local-cli/cli.js bundle --dev false --assets-dest ./ios --entry-file NativeWorker.js --platform ios --bundle-output ./ios/NativeWorker.jsbundle
}

buildAndroidRun() {
	build_core
	prebuild_android
	react-native run-android
}

buildIosSimulator() {
	build_core
	react-native run-ios --simulator "iPhone 11 Pro"
}

buildIosDevice() {
	build_core
	react-native run-ios --device
}

buildIosRelease() {
	build_core
	build_thread_ios

	if [ ! -f "ios/release.xcconfig" ] ; then
		echo "$IOS_ENV" | tr "|" "\n" > ios/release.xcconfig
	fi
	if [ "$RUN_DEVICE" = true ] ; then
		./node_modules/.bin/react-native run-ios --configuration Release --device
	else
		./node_modules/.bin/react-native run-ios --configuration Release --simulator "iPhone 11 Pro"
	fi
	yarn sourcemaps:ios
}

buildAndroidRelease() {
	build_core
	build_thread_android
	prebuild_android

	# GENERATE APK
	cd android && ./gradlew assembleRelease --no-daemon --max-workers 2 && cd ..
	yarn sourcemaps:android
}

buildAndroid() {
	if [ "$MODE" == "release" ] ; then
		buildAndroidRelease
	else
		buildAndroidRun
	fi
}

buildIos() {
	if [ "$MODE" == "release" ] ; then
		buildIosRelease
	else
		if [ "$RUN_DEVICE" = true ] ; then
			buildIosDevice
		else
			buildIosSimulator
		fi
	fi
}

startWatcher() {
	if [ "$MODE" == "clean" ]; then
		watchman watch-del-all
		rm -rf $TMPDIR/react-*
		react-native start -- --reset-cache
	else
		react-native start
	fi
}

checkParameters "$@"

printTitle

if [ "$PLATFORM" == "ios" ]; then
	buildIos
elif [ "$PLATFORM" == "watcher" ]; then
	startWatcher
else
	buildAndroid
fi
