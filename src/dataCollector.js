const fs = require('fs-extra');
const deepmerge = require('deepmerge');

const { 
	getCopyright: rkiCopyright,
	getCounties: rkiGetCounties,
	getDistributionData: rkiGetDistributionData
} = require('./rki.service');

const { 
	getCopyright: statsCopyright,
	getCounties: statsGetCounties
} = require('./statistics.service');

const {
	getCopyright: rsklCopyright,
	getData: rsklGetData
} = require('covid19-risklayer-data');

class DataCollector {

	constructor(options = {}) {
		this.options = deepmerge({
			debug: false,
			debugCache: false,
			rkiCacheFile: '.cache/.rki-counties.json',
			rkiDistributionCacheFile: '.cache/.rki-distribution.json',
			rsklCacheFile: '.cache/.rskl.json',
			statsCacheFile: '.cache/.stats.json',
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
		this.sources = [
			rkiCopyright(),
			rsklCopyright(),
			statsCopyright()
		];

		//TODO: try https://www.npmjs.com/package/axios-cache-adapter

		var rkiCounties;
		if (this.options.debugCache) {
			if (fs.existsSync(this.options.rkiCacheFile)) {
				this.log(`loading rki-data from cache...`);
				rkiCounties = await fs.readJSON(this.options.rkiCacheFile);
			} else {
				this.log(`no cache availible loading rki-data from server...`);
				rkiCounties = await rkiGetCounties();
				await fs.writeJSON(this.options.rkiCacheFile, rkiCounties);
			}
		} else {
			rkiCounties = await rkiGetCounties();
		}

		var rkiDistribution;
		if (this.options.debugCache) {
			if (fs.existsSync(this.options.rkiDistributionCacheFile)) {
				this.log(`loading rki-distribution-data from cache...`);
				rkiDistribution = await fs.readJSON(this.options.rkiDistributionCacheFile);
			} else {
				this.log(`no cache availible loading rki-distribution-data from server...`);
				rkiDistribution = await rkiGetDistributionData();
				await fs.writeJSON(this.options.rkiDistributionCacheFile, rkiDistribution);
			}
		} else {
			rkiDistribution = await rkiGetDistributionData();
		}

		var statsData;
		if (this.options.debugCache) {
			if (fs.existsSync(this.options.statsCacheFile)) {
				this.log(`loading stats-data from cache...`);
				statsData = await fs.readJSON(this.options.statsCacheFile);
			} else {
				this.log(`no cache availible loading stats-data from server...`);
				statsData = await statsGetCounties();
				await fs.writeJSON(this.options.statsCacheFile, statsData || {});
			}
		} else {
			statsData = await statsGetCounties();
		}

		var rsklData = [];
		if (this.options.googleSheetsApi) {
			if (this.options.debugCache) {
				if (fs.existsSync(this.options.rsklCacheFile)) {
					this.log(`loading rskl-data from cache...`);
					rsklData = await fs.readJSON(this.options.rsklCacheFile);
				} else {
					this.log(`no cache availible loading rskl-data from server...`);
					rsklData = await rsklGetData(this.options.googleSheetsApi);
					await fs.writeJSON(this.options.rsklCacheFile, rsklData || {});
				}
			} else {
				rsklData = await rsklGetData(this.options.googleSheetsApi);
			}
		}

		this._combineData(rkiCounties, rkiDistribution, statsData, rsklData);
	}

	_combineData(rkiCounties, rkiDistribution, statsData, rsklData) {
		rkiCounties.forEach(county => {
			var entry = {};

			// we need to use RS for berlin. See #1
			const AGS = `${county.AGS || county.RS}`;

			if (!AGS) {
				this.log(`WARN: Skipping a county because of a missing AGS: "${county.name || county.GEN}"`);
				return;
			}

			var rsklEntry = rsklData.find(d => AGS.includes(d.AGS));
			var statsEntry = statsData.find(d => AGS.includes(d.ags) || `${d.ags}`.includes(AGS));
			if (!statsEntry) {
				this.log(`WARN: no statistics-data found for AGS: "${AGS}" (${county.county || '?'})`)
			}

			var distributionEntrys = rkiDistribution
				.filter(d => AGS.includes(d.AGS) || `${d.AGS}`.includes(AGS))
				.map(d => {
					return {
						gender: d.Geschlecht.toLowerCase(),
						name: d.Altersgruppe,
						count: d.value
					}
				})

			//TODO: use last report or rsklData.time or statsEntry.lastUpdate is newer
			var lastUpdate = new Date().getTime();

			entry.meta = {
				lastUpdate
			};

			if (this.sources && this.sources.length) {
				entry.meta.sources = this.sources
			}

			entry.region = {
				OBJECTID: county.OBJECTID,
				AGS: AGS,
				GEN: county.GEN,
				BEZ: county.BEZ,
				state: county.BL,
				name: county.county,
				population: county.EWZ
			}

			if (statsEntry) {
				["area", "population_male", "population_female", "population_density_km"].forEach(key => {
					if (statsEntry[key]) entry.region[key] = statsEntry[key];
				});
			}

			entry.data = {
				infected_total: county.cases,
				deaths_total: county.deaths,
				death_rate: county.death_rate,
				cases_per_100k: county.cases_per_100k
			}

			if (rsklEntry) {
				["immune", "quarantine", "intensive"].forEach(key => {
					if (rsklEntry[key]) entry.data[`${key}_total`] = rsklEntry[key];
				});
				//TODO: check if "cases" and "death" are the same as from rki. If not show warning!
			}

			if (distributionEntrys) {
				entry.distribution = distributionEntrys
			}

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

	async getCoutiesData() {
		this.log(`DataCollector.getCoutiesData()`);
		await this._ensureData();
		return this.data;
	}

	async getCountyDataByAGS(ags) {
		this.log(`DataCollector.getCountyDataByAGS(ags:${ags})`);
		await this._ensureData();
		return this.data.find(d => `${d.region.AGS}`.includes(ags) || ags.includes(`${d.region.AGS}`)) || null;
	}

	async getCountyDataByObjectId(id) {
		this.log(`DataCollector.getCountyDataByObjectId(id:${id})`);
		await this._ensureData();
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
