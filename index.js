const DataCollector = require('./src/dataCollector');
const { getDistributionData } = require('./src/rki.service');

/**
 * For this to work you need a *.env" file in the save directory 
 * containing the variables:
 * 
 * GOOGLE_SERVICE_ACCOUNT_EMAIL
 * GOOGLE_PRIVATE_KEY
 * 
 * @see https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication?id=service-account
 */
require('dotenv').config();

(async () => {

	const dataCollector = new DataCollector({
		debug: true,
		debugCache: true,

		googleSheetsApi: {
			clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
			privateKey: process.env.GOOGLE_PRIVATE_KEY,
		}
	});

	/* print data for AGS=05370 (Heinsberg) */
	const county = await dataCollector.getCountyDataByAGS('05370');
	console.log("Found county with AGS=05370: ", county);

	/* print sorted data table */
	const counties = await dataCollector.getCoutiesData();
	console.table(
		counties
			.sort((a,b) => b.data.cases_per_100k - a.data.cases_per_100k)
			.map(c => ({
				name: c.region.name,
				cases: c.data.cases_per_100k,
				deaths: c.data.deaths_total
			}))
	);

	/* print all data as CSV */
	console.log(`name; cases; deaths`);
	counties.forEach(c => {
		console.log(`${c.region.name}; ${c.data.cases_per_100k}; ${c.data.deaths_total}`);
	});

})();