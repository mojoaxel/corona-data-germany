# corona-data-germany

fresh #coronavirus data for germany (RKI)

## Setup

```sh
npm install --save corona-data-germany
```

To access the Google-Sheets-API (risklayer data) we need to se the two env-variables:

* `GOOGLE_SERVICE_ACCOUNT_EMAIL`
* `GOOGLE_PRIVATE_KEY`

See https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication?id=service-account

The easies way ist just to create a `.env` file in the root of the project!

## Example

To run the examples just execute the index.js:

```sh
node index.js
```

### print data for AGS=05370 (Heinsberg)

```js
const county = await dataCollector.getCountyDataByAGS('05370');
console.log("Found county with AGS=05370: ", county);
```

Output:

```
{
  meta: {
    lastUpdate: 1584870500532,
    sources: [
      'Robert Koch-Institut',
      'Risklayer GmbH (www.risklayer.com) and Center for Disaster Management and Risk Reduction Technology (CEDIM) at Karlsruhe Institute of Technology (KIT) and the Risklayer-CEDIM SARS-CoV-2 Crowdsourcing Contributors',
      'Statistisches Bundesamt (Destatis), Feb 2020'
    ]
  },
  region: {
    /* LK: Landkreis; SK: Kreisfreie Stadt; usw. */
    name: 'LK Heinsberg',

    /* Amtliche Gemeindeschlüssel */
    AGS: '05370',
    GEN: 'Heinsberg',
    BEZ: 'Kreis',

    /* Bundesland */
    state: 'Nordrhein-Westfalen',

    population: 254322,
    area: 627.92,
    malePopulation: 125849,
    femalePopulation: 128473,
    populationPerSquareKilometer: 4277
  },
  data: { 
    cases: 808, 
    deaths: 5, 
    immune: 84, 
    quarantine: 71
  }
}
```

### print data table

Print data-table sort by cases:

```javascript
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
```

```sh
┌─────────┬────────────────────────────────────────┬──────────────────┬────────┐
│ (index) │                  name                  │      cases       │ deaths │
├─────────┼────────────────────────────────────────┼──────────────────┼────────┤
│    0    │ 'LK Sächsische Schweiz-Osterzgebirge'  │ 22366.6037381192 │  1324  │
│    1    │              'LK Bautzen'              │ 21482.1650280192 │  1305  │
│    2    │          'LK Erzgebirgskreis'          │ 20843.4638780177 │  1454  │
│    3    │          'LK Hildburghausen'           │ 20580.6307456588 │  366   │
│    4    │              'LK Meißen'               │ 19615.0949989807 │  881   │
│    5    │           'LK Mittelsachsen'           │ 19239.1383668243 │  957   │
...
```

### print all case data as CSV

```js
const counties = await dataCollector.getCoutiesData();
console.log(`name; cases; deaths`);
counties.forEach(c => console.log(`${c.region.name}; ${c.data.cases_per_100k}; ${c.data.deaths_total}`));
```

Output:

```csv
name; cases; deaths
LK Sächsische Schweiz-Osterzgebirge; 22366.6037381192; 1324
LK Bautzen; 21482.1650280192; 1305
LK Erzgebirgskreis; 20843.4638780177; 1454
LK Hildburghausen; 20580.6307456588; 366
LK Meißen; 19615.0949989807; 881
...
```

## License

AGPL-3.0-or-later

Copyright 2020 by Alexander Wunschik <dev@wunschik.net> and contributors
