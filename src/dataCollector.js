const fs = require('fs-extra');
const deepmerge = require('deepmerge');

const { 
	getCopyright: rkiCopyright,
	getCounties: rkiGetCounties
} = require('./rki.service');

const {
	getCopyright: rsklCopyright,
	getData: rsklGetData
} = require('covid19-risklayer-data');

class DataCollector {

	constructor(options = {}) {
		this.options = deepmerge({
			debug: false,
			debugCache: false,
			rkiCacheFile: '.rki.cache.json',
			rsklCacheFile: '.rskl.cache.json'
		}, options);

		this.log = this.options.debug ?  console.log : (() => {});

		this.data;
		this.sources;
	}
	
	async _ensureData() {
		if (!this.data || !this.data.length) {
			this.log(`this.data is not initialized yet. Calling "load".`);
			await this._load();
		}
	}

	async _load() {
		this.data = [];
		const sources = [
			rkiCopyright(),
			rsklCopyright()
		];

		var counties;
		if (this.options.debugCache) {
			if (fs.existsSync(this.options.rkiCacheFile)) {
				this.log(`loading rki-data from cache...`);
				counties = await fs.readJSON(this.options.rkiCacheFile);
			} else {
				this.log(`no cache availible loading rki-data from server...`);
				counties = await rkiGetCounties();
			}
		}

		if (this.options.googleSheetsApi) {
			var rsklData;
			if (this.options.debugCache) {
				if (fs.existsSync(this.options.rsklCacheFile)) {
					this.log(`loading rskl-data from cache...`);
					rsklData = await fs.readJSON(this.options.rsklCacheFile);
				} else {
					this.log(`no cache availible loading rskl-data from server...`);
					rsklData = await rsklGetData(this.options.googleSheetsApi);
				}
			}
		}

		if (this.options.debugCache) {
			this.log(`saving data to cache files...`);
			await fs.writeJSON(this.options.rkiCacheFile, counties);
			await fs.writeJSON(this.options.rsklCacheFile, rsklData || {});
		}

			this._combineData(counties, rsklData);
	}

	_combineData(counties, rsklData) {
		counties.forEach(county => {
			var entry = {};

			if (!county.AGS) {
				this.log(`WARN: Skipping a county because of a missing AGS: "${county.name || county.GEN}"`);
				return;
			}

			var rsklEntry = rsklData.find(d => `${county.AGS}`.includes(d.AGS));

			//TODO: use last report or rsklData.time if newer!
			var lastUpdate = new Date().getTime();

			entry.meta = {
				lastUpdate
			};

			if (sources && sources.length) {
				entry.meta.sources = sources
			}

			entry.region = {
				OBJECTID: county.OBJECTID,
				AGS: county.AGS,
				GEN: county.GEN,
				BEZ: county.BEZ,
				state: county.BL,
				name: county.county,
			}

			entry.data = {
				cases: county.cases,
				deaths: county.deaths,

				//death_rate: county.death_rate,
				//cases_per_100k: county.cases_per_100k,
				//cases_per_population: county.cases_per_population,
			}

			if (rsklEntry) {
				["immune", "quarantine", "intensive"].forEach(key => {
					if (rsklEntry[key]) entry.data[key] = rsklEntry[key];
				});
				//TODO: check if "cases" and "death" are the same as from rki. If not show warning!
			}

			//TODO: entry.distribution

			//TODO: entry.reports

			this.data.push(entry);
		});
	}

	async getSources() {
		this.log(`DataCollector.getCountyList()`);
		await this._ensureData();
		return this.sources;
	}

	async getCountyList() {
		this.log(`DataCollector.getCountyList()`);
		await this._ensureData();
		return this.data.map(d => d.region) || [];
	}

	async getCountyDataByAGS(ags) {
		this.log(`DataCollector.getCountyDataByAGS(ags:${ags})`);
		await this._ensureData();
		return this.data.find(d => `${d.region.AGS}`.includes(ags) || ags.includes(`${d.region.AGS}`)) || null;
	}

	async getCountyDataByObjectId(id) {
		this.log(`DataCollector.getCountyDataByObjectId(id:${id})`);
		await this._ensureData();
		console.log(this.data.map(d => d.region.OBJECTID));
		return this.data.find(d => d.region.OBJECTID == id) || null;
	}

	async findCountiesByName(name) {
		this.log(`DataCollector.findCountiesByName(name:${name})`)
		await this._ensureData();
		return this.data.filter(d => 
			(d.region.name && d.region.name.includes(name)) || 
			(d.region.GEN && d.region.GEN.includes(name)) || 
			(d.region.state && d.region.state.includes(name))
		) || null;
	}

}

module.exports = DataCollector;
