const axios = require('axios').default;
const deepmerge = require('deepmerge');

/*
"attributes": {
	"OBJECTID": 86,
	"ADE": 4,
	"GF": 4,
	"BSG": 1,
	"RS": "05370",
	"AGS": "05370",
	"SDV_RS": "053700016016",
	"GEN": "Heinsberg",
	"BEZ": "Kreis",
	"IBZ": 42,
	"BEM": "--",
	"NBD": "ja",
	"SN_L": "05",
	"SN_R": "3",
	"SN_K": "70",
	"SN_V1": "00",
	"SN_V2": "00",
	"SN_G": "000",
	"FK_S3": "R",
	"NUTS": "DEA29",
	"RS_0": "053700000000",
	"AGS_0": "05370000",
	"WSK": "2009/01/01 00:00:00.000",
	"EWZ": 254322,
	"KFL": 627.92,
	"DEBKG_ID": "DEBKGDL20000DX0T",
	"Shape__Area": 627310851.182861,
	"Shape__Length": 166217.280069434,
	"death_rate": 0.619578686493185,
	"cases": 807,
	"deaths": 5,
	"cases_per_100k": 317.314270884941,
	"cases_per_population": 0.317314270884941,
	"BL": "Nordrhein-Westfalen",
	"BL_ID": "5",
	"county": "LK Heinsberg"
}
*/

function getCopyright() {
	return "Robert Koch-Institut";
}

async function getCounties(options = {}) {
	const opts = deepmerge({
		queryUrl: "https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_Landkreisdaten/FeatureServer/0/query",
		fields: [
			"OBJECTID",
			"AGS",
			"GEN",
			"BEZ",
			"AGS_0",
			"BL",
			"county",
			"death_rate",
			"cases",
			"deaths",
			"cases_per_100k",
			"cases_per_population",
		]
	}, options);

	var data = [];
	try {
		var response = await axios.get(opts.queryUrl, {
			params: {
				f: "json",
				where: "1=1",
				returnGeometry: false,
				outFields: opts.fields.join(','),
				resultOffset: 0,
				resultRecordCount: 3000,
				cacheHint: true
			}
		});
		data = response.data.features;
	} catch(err) {
		throw new Error(`Error requesting data from RKI: ${err}`);
	}

	return data.map(e => e.attributes);
}

module.exports = {
	getCopyright,
	getCounties
}