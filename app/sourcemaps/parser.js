const source_map = require('source-map');
const fs = require('fs');

(function(args) {
	fs.readFile('./index.android.js.map', 'utf8', async function(err, data) {
		const smc = await new source_map.SourceMapConsumer(data);
		console.log(
			smc.originalPositionFor({
				line: Number(args[0]),
				column: Number(args[1])
			})
		);
	});
})(process.argv.slice(2));
