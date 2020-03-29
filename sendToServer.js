const DataCollector = require("./src/dataCollector");
const axios = require("axios").default;
const ora = require("ora");
const deepmerge = require('deepmerge');

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

/**
 * age_group
 * gender
 * cases_new
 * deaths_new
 * last_updated
 */
async function updateCases(county) {
  // reduce to single days
  let reports = county.reports.map(r => {
    r.last_updated = (new Date(r.last_updated)).toISOString().split("T")[0];
    delete r.age_group;
    delete r.gender;
    return r
  }).reduce((acc, r) => {
    if (acc[r.last_updated]) {
      acc[r.last_updated].cases_total += r.cases_new;
      acc[r.last_updated].deaths_total += r.deaths_new;
    } else {
      acc[r.last_updated] = {
        last_updated: r.last_updated,
        cases_total: r.cases_new,
        deaths_total: r.deaths_new
      };
    }
    return acc;
  }, {});

  // accumulate
  let cases_total = 0;
  let deaths_total = 0;
  reports = Object.values(reports)
    .sort((a, b) => a.last_updated.localeCompare(b.last_updated))
    .map(r => {
      r.cases_total = cases_total += r.cases_total;
      r.deaths_total = deaths_total += r.deaths_total;
      return r;
    }).map(r => {
      return {
        infected_total: r.cases_total,
        deaths_total: r.deaths_total,
        date_day: r.last_updated,
        last_updated: new Date().toISOString()
      }
    }).filter(r => r.date_day < (new Date().toISOString().split("T")[0]));

  const AGS = county.region.AGS;
  try {
    const response = await axios(`https://covid19-api-backend.herokuapp.com/api/v0.1/county/${AGS}/cases/`);
    const responseData = response.data;

    reports = reports.map(r => {
      const oldEntry = responseData.find(o => o.date_day === r.date_day);
      return deepmerge(oldEntry || {}, r);
    }).map(r => {
      if (!r.intensive_total) delete r.intensive_total;
      if (!r.immune_total) delete r.immune_total;
      if (!r.quarantine_total) delete r.quarantine_total;
      if (!r.infected_per_100k) delete r.infected_per_100k;
      if (!r.death_rate || !r.deaths_total) delete r.death_rate;
      return r;
    });
  } catch(err) {
    console.log(`Error getting cases for AGS:${AGS} from server: ${err}`);
  }

  //console.log(reports);

  let spinner;
  try {
    for (var data of reports) {
      spinner = ora(
        `sending historical case-data from "${data.date_day}" for "${county.region.name} (${county.region.AGS})" to server`
      ).start();

      let response = await axios({
        method: "post",
        url: `https://covid19-api-backend.herokuapp.com/api/v0.1/county/${county.region.AGS}/cases/`,
        headers: {
          Authorization: `Token ${process.env.API_TOKEN}`
        },
        data
      });
      spinner.succeed(
        `${response.status}: ${response.statusText} case-data "${county.region.name}" [${data.date_day}]`
      );

    }
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

  const county = await dataCollector.getCountyDataByAGS('05370');
  //console.log(county);
  //await sendCases(county);
  //await sendDistribution(county);
  //await updateCases(county);

  const counties = await dataCollector.getCoutiesData();
  for (const county of counties) {
    await updateCases(county);
    await sendCases(county);
    await sendDistribution(county);
  }
})();
