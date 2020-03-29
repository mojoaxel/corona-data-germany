const DataCollector = require("./src/dataCollector");
const axios = require("axios").default;
const ora = require("ora");

/**
 * For this to work you need a *.env" file in the save directory
 * containing the variables:
 *
 * GOOGLE_SERVICE_ACCOUNT_EMAIL
 * GOOGLE_PRIVATE_KEY
 *
 * @see https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication?id=service-account
 */
require("dotenv").config();

async function sendCounty(county) {
  const spinner = ora(`sending "${county.region.name}" to server`).start();
  try {
    const response = await axios({
      method: "post",
      url: "https://covid19-api-backend.herokuapp.com/api/v0.1/county/",
      headers: {
        Authorization: `Token ${process.env.API_TOKEN}`
      },
      data: {
        name: county.region.name,
        ags: county.region.AGS,
        state: county.region.state,
        bez: county.region.BEZ,
        gen: county.region.GEN,
        population: county.region.population,
        population_density_km: county.region.population_density_km,
        population_male: county.region.population_male,
        population_female: county.region.population_female
      }
    });
    spinner.succeed(
      `${response.status}: ${response.statusText} "${county.region.name} (${county.region.AGS})"`
    );
  } catch (err) {
    spinner.fail(
      `POST region-data "${county.region.name}": ${err.response.status}: ${err.response.statusText}`
    );
  }
}

async function sendCases(county) {
  const spinner = ora(
    `sending case data for "${county.region.name} (${county.region.AGS})" to server`
  ).start();
  try {
    const data = {
      infected_total: county.data.infected_total,
      deaths_total: county.data.deaths_total,
      date_day: new Date(county.meta.last_updated).toISOString().split("T")[0],
      last_updated: new Date().toISOString()
    };

    if (county.data.intensive_total && !isNaN(county.data.intensive_total)) {
      data.intensive_total = county.data.intensive_total;
    }
    if (county.data.immune_total && !isNaN(county.data.immune_total)) {
      data.immune_total = county.data.immune_total;
    }

    if (county.data.quarantine_total && !isNaN(county.data.immune_total)) {
    	data.quarantine_total = county.data.quarantine_total;
    }
    if (county.data.infected_per_100k) {
    	data.infected_per_100k = county.data.infected_per_100k;
    }
    if (county.data.death_rate) {
    	data.death_rate = county.data.death_rate;
    }

    //console.log(data);

    const response = await axios({
      method: "post",
      url: `https://covid19-api-backend.herokuapp.com/api/v0.1/county/${county.region.AGS}/cases/`,
      headers: {
        Authorization: `Token ${process.env.API_TOKEN}`
      },
      data
    });
    spinner.succeed(
      `${response.status}: ${response.statusText} "${county.region.name}"`
    );
  } catch (err) {
    spinner.fail(
      `POST cases-data "${county.region.name} (${county.region.AGS})": ${err.response.status}: ${err.response.statusText}`
    );
  }
}

async function sendDistribution(county) {
  for (const entry of county.distribution) {
    const spinner = ora(
      `sending case data for "${county.region.name} (${county.region.AGS})" to server`
    ).start();
    var data;
    try {
      data = {
        infected_total:  entry.infected_total,
        deaths_total: entry.deaths_total,
        gender: entry.gender || 'unbekannt',
        age_group: entry.age_group || 'unbekannt',
        date_day: new Date(county.meta.last_updated).toISOString().split("T")[0],
        last_updated: (new Date()).toISOString()
      };

      //console.log(data);

      const response = await axios({
        method: "post",
        url: `https://covid19-api-backend.herokuapp.com/api/v0.1/county/${county.region.AGS}/gender_age/`,
        headers: {
          Authorization: `Token ${process.env.API_TOKEN}`
        },
        data
      });
      spinner.succeed(
        `${response.status}: ${response.statusText} "${county.region.name} [${data.gender}][${data.age_group}]"`
      );
    } catch (err) {
      spinner.fail(
        `POST distribution-data "${county.region.name} (${county.region.AGS})": ${err}`
      );
      console.error(data);
    }
  }
}

(async () => {
  const dataCollector = new DataCollector({
    debug: true,
    debugCache: true,

    googleSheetsApi: {
      clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY
    }
  });

  //const county = await dataCollector.getCountyDataByAGS('05370');
  //console.log(county);
  //await sendCases(county);
  //await sendDistribution(county);

  const counties = await dataCollector.getCoutiesData();
  for (const county of counties) {
    await sendCases(county);
    await sendDistribution(county);
  }
})();
