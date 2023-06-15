import { EthersUtils } from 'paliwallet-core';

export const failedSeedPhraseRequirements = seed => {
	const wordCount = seed.split(/\s+/u).length;
	return wordCount % 3 !== 0 || wordCount > 24 || wordCount < 12;
};

export const getWords = seed => seed?.split(/\s+/u);

export const updateSeed = (seed, index, word) => {
	const newWord = word?.trim() || '';
	const words = seed.split(/\s+/u);
	if (words[index]) {
		words[index] = newWord;
	} else {
		words.push(newWord);
	}
	let newSeed = '';
	words.slice(0, 24).forEach(word => {
		newSeed = newSeed + word + ' ';
	});
	return newSeed.trim();
};

export const isInvalidSeed = (seed: string[]) => {
	const wordCount = seed.length;
	return wordCount % 3 !== 0 || wordCount > 24 || wordCount < 12;
};

export const parseSeedPhrase = seedPhrase =>
	(seedPhrase || '')
		.trim()
		.toLowerCase()
		.match(/\w+/gu)
		?.join(' ') || '';

export const { isValidMnemonic } = EthersUtils;
