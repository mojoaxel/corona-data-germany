const axios = require('axios').default;
const deepmerge = require('deepmerge');


function getCopyright() {
	return "Robert Koch-Institut";
}

function _cleanAgeGrous(str) {
	str = str.replace(/A/g, '');
	if (str.includes('-')) {
		var ages = str.split('-')
		return `${Number(ages[0])}-${Number(ages[1])}`
	}
	return str
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
				where: '1=1',
				returnGeometry: false,
				spatialRel: "esriSpatialRelIntersects",
				outFields: opts.fields.join(','),
				groupByFieldsForStatistics: 'IdLandkreis,Geschlecht,Altersgruppe',
				orderByFields: 'IdLandkreis asc',
				outStatistics: `[
					{"statisticType":"sum","onStatisticField":"AnzahlFall","outStatisticFieldName":"cases"},
					{"statisticType":"sum","onStatisticField":"AnzahlTodesfall","outStatisticFieldName":"deaths"}
				]`.trim().replace('\s*',' '),
				cacheHint: true,
			}
		}, 'features');
		data = response.data.features
			.map(d => d.attributes)
			.map(d => {
				// rename IdLandkreis to AGS
				d.AGS = d.IdLandkreis;
				d.Altersgruppe = _cleanAgeGrous(d.Altersgruppe);
				delete d.IdLandkreis;
				return d;
			});
	} catch(err) {
		throw new Error(`Error requesting data from RKI: ${err}`);
	}

	return data;
}

/*
{
"IdBundesland": 9,
"Bundesland": "Bayern",
"Landkreis": "LK Landsberg a.Lech",
"Altersgruppe": "A15-A34",
"Geschlecht": "M",
"AnzahlFall": 1,
"AnzahlTodesfall": 0,
"ObjectId": 169247,
"Meldedatum": 1580169600000,
"IdLandkreis": "09181",
"Datenstand": "22.03.2020 00:00"
}
*/
async function getReportsData(options = {}) {
	const opts = deepmerge({
		queryUrl: "https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_COVID19/FeatureServer/0/query",
		fields: [
			"Altersgruppe",
			"Geschlecht",
			"AnzahlFall",
			"AnzahlTodesfall",
			"Meldedatum",
			"IdLandkreis",
			"Datenstand"
		]
	}, options);

	var data = [];
	try {
		var response = await _fetchAll(opts.queryUrl, {
			params: {
				f: 'json',
				where: '1=1',
				returnGeometry: false,
				spatialRel: "esriSpatialRelIntersects",
				outFields: opts.fields.join(','),
				//groupByFieldsForStatistics: 'IdLandkreis,Geschlecht,Altersgruppe',
				orderByFields: 'Meldedatum asc',
				//outStatistics: '[{"statisticType":"sum","onStatisticField":"AnzahlFall","outStatisticFieldName":"value"}]',
				cacheHint: true,
			}
		}, 'features');
		data = response.data.features
			.map(d => d.attributes)
			.map(d => {
				return {
					AGS: d.IdLandkreis,
					age_group: _cleanAgeGrous(d.Altersgruppe),
					gender: d.Geschlecht,
					cases_new: d.AnzahlFall,
					deaths_new: d.AnzahlTodesfall,
					last_updated: d.Meldedatum,
					//date_day: d.Datenstand.split(' ')[0]
				};
			});
	} catch(err) {
		throw new Error(`Error requesting data from RKI: ${err}`);
	}

	return data;
}

module.exports = {
	getCopyright,
	getCounties,
	getDistributionData,
	getReportsData
}