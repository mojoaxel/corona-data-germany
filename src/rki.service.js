const axios = require('axios').default;
const deepmerge = require('deepmerge');


function getCopyright() {
	return "Robert Koch-Institut";
}

async function _fetchAll(url, options, key) {
	var data = [];
	const MAX_DATA = 100000;
	var resultRecordCount = 2000;
	var resultOffset = 0;
	var lastDataLength = resultRecordCount;

	while ((lastDataLength >= resultRecordCount) && (resultOffset <= MAX_DATA)) {
		console.log(`fetching data ${resultOffset}-${resultOffset+resultRecordCount}`);
		const opt = deepmerge(options, { 
			params: {
				resultOffset, 
				resultRecordCount 
			}
		});
		var response = await axios.get(url, opt);
		lastDataLength = response.data[key].length;
		resultOffset += lastDataLength;
		data = deepmerge(data, response.data);
	}
	return {
		data
	};
}

async function getCounties(options = {}) {
	const opts = deepmerge({
		queryUrl: "https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_Landkreisdaten/FeatureServer/0/query",
		fields: [
			"OBJECTID",
			"RS",
			"AGS",
			"GEN",
			"BEZ",
			"EWZ",
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
		var response = await _fetchAll(opts.queryUrl, {
			params: {
				f: "json",
				where: "1=1",
				returnGeometry: false,
				outFields: opts.fields.join(','),
				cacheHint: true
			}
		}, 'features');
		data = response.data.features;
	} catch(err) {
		throw new Error(`Error requesting data from RKI: ${err}`);
	}

	return data.map(e => e.attributes);
}

async function getDistributionData(options = {}) {
	const opts = deepmerge({
		queryUrl: "https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_COVID19/FeatureServer/0/query",
		fields: [
			"*",
		]
	}, options);

	var data = [];
	try {
		var response = await _fetchAll(opts.queryUrl, {
			params: {
				f: 'json',
				where: `(Geschlecht<>'unbekannt' AND Altersgruppe<>'unbekannt')`,
				returnGeometry: false,
				spatialRel: "esriSpatialRelIntersects",
				outFields: opts.fields.join(','),
				groupByFieldsForStatistics: 'IdLandkreis,Geschlecht,Altersgruppe',
				orderByFields: 'IdLandkreis asc',
				outStatistics: '[{"statisticType":"sum","onStatisticField":"AnzahlFall","outStatisticFieldName":"value"}]',
				cacheHint: true,
			}
		}, 'features');
		data = response.data.features
			.map(d => d.attributes)
			.map(d => {
				// rename IdLandkreis to AGS
				d.AGS = d.IdLandkreis;
				delete d.IdLandkreis;
				return d;
			});
	} catch(err) {
		throw new Error(`Error requesting data from RKI: ${err}`);
	}

	return data;
}

module.exports = {
	getCopyright,
	getCounties,
	getDistributionData
}