import browserReducer from './browser';
import engineReducer from './engine';
import modalsReducer from './modals';
import settingsReducer from './settings';
import alertReducer from './alert';
import transactionReducer from './transaction';
import notificationReducer from './notification';
import infuraAvailabilityReducer from './infuraAvailability';
import { combineReducers } from 'redux';
import hintReducer from './hint';
import scannerReducer from './scanner';
import nftReducer from './nft';
import walletconnectReducer from './walletconnect';

const rootReducer = combineReducers({
	engine: engineReducer,
	browser: browserReducer,
	modals: modalsReducer,
	settings: settingsReducer,
	alert: alertReducer,
	transaction: transactionReducer,
	notification: notificationReducer,
	infuraAvailability: infuraAvailabilityReducer,
	hint: hintReducer,
	scanner: scannerReducer,
	nft: nftReducer,
	walletconnect: walletconnectReducer
});

export default rootReducer;
