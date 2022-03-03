#!/bin/bash

set -o pipefail

readonly __DIRNAME__="$( cd "${BASH_SOURCE[0]%/*}" && pwd )"
readonly REPO_ROOT_DIR="$(dirname "${__DIRNAME__}")"

PLATFORM=$1
MODE=$2
TARGET=$3
RUN_DEVICE=false
PRE_RELEASE=false

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
		elif [ "$3"  == "--pre" ] ; then
			PRE_RELEASE=true
		else
			printError "Unknown argument: $4"
			displayHelp
			exit 0;
		fi
	fi
}

prebuild_ios() {
	if [ "$PRE_RELEASE" = true ] ; then
		echo "" > ios/debug.xcconfig
		echo "" > ios/release.xcconfig
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

buildAndroidRun() {
	build_core
	prebuild_android
	react-native run-android
}

buildIosSimulator() {
	build_core
	prebuild_ios
	react-native run-ios --simulator "iPhone 11 Pro"
}

buildIosDevice() {
	build_core
	prebuild_ios
	react-native run-ios --device
}

buildIosRelease() {
	build_core
	prebuild_ios

	# Replace release.xcconfig with ENV vars
	if [ "$PRE_RELEASE" = true ] ; then
		echo "Setting up env vars...";
		echo "Build started..."
		brew install watchman
		cd ios && bundle install && bundle exec fastlane prerelease
		# Generate sourcemaps
		yarn sourcemaps:ios
	else
		if [ ! -f "ios/release.xcconfig" ] ; then
			echo "$IOS_ENV" | tr "|" "\n" > ios/release.xcconfig
		fi
		if [ "$RUN_DEVICE" = true ] ; then
			./node_modules/.bin/react-native run-ios --configuration Release --device
		else
			./node_modules/.bin/react-native run-ios --configuration Release --simulator "iPhone 11 Pro"
		fi
	fi
}

buildAndroidRelease() {
	build_core
	prebuild_android

	if [ "$PRE_RELEASE" = true ] ; then
		TARGET="android/app/build.gradle"
		sed -i'' -e 's/getPassword("mm","mm-upload-key")/"ANDROID_KEY"/' $TARGET;
		sed -i'' -e "s/ANDROID_KEY/$ANDROID_KEY/" $TARGET;
		echo "$ANDROID_KEYSTORE" | base64 --decode > android/keystores/release.keystore
	fi

	# GENERATE APK
	cd android && ./gradlew assembleRelease --no-daemon --max-workers 2

	# GENERATE BUNDLE
	if [ "$GENERATE_BUNDLE" = true ] ; then
		./gradlew bundleRelease
	fi

	if [ "$PRE_RELEASE" = true ] ; then
		# Generate sourcemaps
		yarn sourcemaps:android
		# Generate checksum
		yarn build:android:checksum
	fi

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

checkAuthToken() {
	local propertiesFileName="$1"

	if [ ! -e "./${propertiesFileName}" ]; then
		if [ -n "${MM_SENTRY_AUTH_TOKEN}" ]; then
			cp "./${propertiesFileName}.example" "./${propertiesFileName}"
		else
			printError "Missing '${propertiesFileName}' file (see '${propertiesFileName}.example' or set MM_SENTRY_AUTH_TOKEN to generate)"
			exit 1
		fi
	fi

	if [ -n "${MM_SENTRY_AUTH_TOKEN}" ]; then
		sed -i'' -e "s/auth.token.*/auth.token=${MM_SENTRY_AUTH_TOKEN}/" "./${propertiesFileName}";
	elif ! grep -qE '^auth.token=[[:alnum:]]+$' "./${propertiesFileName}"; then
		printError "Missing auth token in '${propertiesFileName}'; add the token, or set it as MM_SENTRY_AUTH_TOKEN"
		exit 1
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
