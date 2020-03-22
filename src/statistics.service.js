const axios = require('axios').default;
const deepmerge = require('deepmerge');

/*
{
  "ars" : "01001",
  "name" : "Flensburg, Stadt",
  "area" : 56.73,
  "malePopulation" : 44599,
  "femalePopulation" : 44905,
  "populationPerSquareKilometer" : 1578,
  "lastUpdate" : "2018-12-31"
}
*/

function getCopyright() {
	return "Statistisches Bundesamt (Destatis), Feb 2020"
}

async function getCounties(options = {}) {
	const opts = deepmerge({
		queryUrl: "https://raw.githubusercontent.com/lobicolonia/covid19-community-data/master/comunitydata.json",
	}, options);

	var data = [];
	try {
		var response = await axios.get(opts.queryUrl);
		data = response.data;
	} catch(err) {
		throw new Error(`Error requesting data from Destatis: ${err}`);
	}

	return data.map(d => {
		d.lastUpdate = (new Date(d.lastUpdate)).getTime();
		return d;
	});
}

module.exports = {
	getCopyright,
	getCounties
}