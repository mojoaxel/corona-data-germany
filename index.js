const DataCollector = require('./src/dataCollector');

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

	const county = await dataCollector.getCountyDataByObjectId(86);
	console.log("Found county with ObjId=86: ", county);

})();