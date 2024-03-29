import './shim.js';
import '@walletconnect/react-native-compat';
import 'react-native-gesture-handler';

import crypto from 'crypto'; // eslint-disable-line import/no-nodejs-modules, no-unused-vars
require('react-native-browser-polyfill'); // eslint-disable-line import/no-commonjs

import { AppRegistry, LogBox } from 'react-native';
import Root from './app/components/Views/Root';
import { name } from './app.json';

// List of warnings that we're ignoring
LogBox.ignoreLogs([
	'{}',
	'componentWillMount has been renamed',
	"Can't perform a React state update",
	'Error evaluating injectedJavaScript',
	'createErrorFromErrorData',
	'Encountered an error loading page',
	'Error handling userAuthorizedUpdate',
	'MaxListenersExceededWarning',
	'Expected delta of 0 for the fields',
	'The network request was invalid',
	'Require cycle',
	'ListView is deprecated',
	'WebView has been extracted from react-native core',
	'Exception was previously raised by watchStore',
	'StateUpdateController',
	'this.web3.eth',
	'collectibles.map',
	'Warning: bind(): You are binding a component method to the component',
	'AssetsDectionController._callee',
	'Accessing view manager configs directly off',
	'Function components cannot be given refs.',
	'Task orphaned for request',
	'Module RNOS requires',
	'use RCT_EXPORT_MODULE',
	'Setting a timer for a long period of time',
	'Did not receive response to shouldStartLoad in time',
	'startLoadWithResult invoked with invalid',
	'RCTBridge required dispatch_sync',
	'Remote debugger is in a background tab',
	"Can't call setState (or forceUpdate) on an unmounted component",
	'No stops in gradient',
	"Cannot read property 'hash' of null",
	'componentWillUpdate',
	'componentWillReceiveProps',
	'getNode()',
	'Require cycle:',
	'Require cycle: node_modules/',
	'Require cycle: app/',
	'new NativeEventEmitter',
	'EventEmitter.removeListener',
	'Module TcpSockets requires main queue setup',
	'Module RCTSearchApiManager requires main queue setup'
]);

/**
 * Application entry point responsible for registering root component
 */
AppRegistry.registerComponent(name, () => Root);
