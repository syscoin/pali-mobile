import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a context for the theme
export const ThemeContext = createContext();

// Create a custom hook to use the theme
export const useTheme = () => {
	const { theme, setTheme } = useContext(ThemeContext);
	const isDarkMode = theme === 'dark';

	// Return both theme and isDarkMode
	return { theme, isDarkMode, setTheme };
};

// Create a provider component
export const ThemeProvider = ({ children }) => {
	const [theme, setTheme] = useState('light'); // default theme

	// Load the theme from AsyncStorage when the provider mounts
	useEffect(() => {
		const loadTheme = async () => {
			const storedTheme = await AsyncStorage.getItem('theme');
			if (storedTheme) {
				setTheme(storedTheme);
			}
		};
		loadTheme();
	}, []);

	// Save the theme to AsyncStorage whenever it changes
	useEffect(() => {
		const saveTheme = async () => {
			await AsyncStorage.setItem('theme', theme);
		};
		saveTheme();
	}, [theme]);

	// Wrapping setTheme to provide additional logic if needed
	const updateTheme = newTheme => {
		setTheme(newTheme);
	};

	return (
		<ThemeContext.Provider value={{ theme, isDarkMode: theme === 'dark', setTheme: updateTheme }}>
			{children}
		</ThemeContext.Provider>
	);
};
