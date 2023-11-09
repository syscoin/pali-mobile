import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { checkAndSetLocale } from '../../../../locales/i18n';
import { store, persistor } from '../../../store/';

import App from '../../App';
import SecureKeychain from '../../../core/SecureKeychain';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';

export default class Root extends PureComponent {
	static propTypes = {
		code: PropTypes.string,
		native_start_time: PropTypes.string
	};

	static defaultProps = {
		code: 'gp',
		native_start_time: ''
	};

	constructor(props) {
		super(props);
		SecureKeychain.init(props.code);
		EntryScriptWeb3.init();
		EntryScriptWeb3.initVConsole();
		//Check the user language and defines as the default language.
		checkAndSetLocale();
		global.native_start_time = props.native_start_time ? Number(props.native_start_time) : 0;
	}

	render = () => (
		<Provider store={store}>
			<PersistGate persistor={persistor}>
				<ThemeProvider>
					<App />
				</ThemeProvider>
			</PersistGate>
		</Provider>
	);
}
