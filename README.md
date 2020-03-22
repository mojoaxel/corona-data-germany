# corona-data-germany

fresh #coronavirus data for germany (RKI)

## Setup

```sh
npm install --save corona-data-germany
```

## Example 

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
    OBJECTID: 86,

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

### print all case data as CSV

```js
const counties = await dataCollector.getCoutiesData();
console.log(`name; cases; deaths`);
counties.forEach(c => console.log(`${c.region.name}; ${c.data.cases}; ${c.data.deaths}`));
```

Output:

```csv
name; cases; deaths
SK Flensburg; 13; 0
SK Kiel; 39; 0
SK Lübeck; 21; 1
SK Neumünster; 7; 0
LK Dithmarschen; 12; 0
LK Herzogtum Lauenburg; 21; 0
```

## License

AGPL-3.0-or-later

Copyright 2020 by Alexander Wunschik <dev@wunschik.net> and contributors
