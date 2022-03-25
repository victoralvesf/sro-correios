# 📦 SroCorreios

**SroCorreios** is a JavaScript library for tracking orders through Correios (BR).

[![npm version](https://badge.fury.io/js/sro-correios.svg)](https://www.npmjs.com/package/sro-correios)
[![unpacked size](https://img.shields.io/badge/unpacked%20size-24.1%20kB-informational?color=%234AC41D)](https://www.npmjs.com/package/sro-correios)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat&color=%234AC41D)](https://github.com/victoralvesf/sro-correios/issues)
[![License](https://img.shields.io/npm/l/sro-correios?color=%234AC41D)](https://github.com/victoralvesf/sro-correios/blob/master/LICENSE)
[![types included](https://badgen.net/npm/types/sro-correios)](https://www.npmjs.com/package/sro-correios)

<a href="https://www.npmjs.com/package/sro-correios"><img src="https://nodei.co/npm/sro-correios.png"></a>

## Installation

Use the node package manager to install `sro-correios`.

```bash
npm install sro-correios
```

## Usage

```javascript
import { SroCorreios } from 'sro-correios'

const tracker = new SroCorreios()

async function trackSingleCode() {
  const [result] = await tracker.track('LB711320125HK')
  console.log(result)
}

trackSingleCode()

async function trackMultipleCodes() {
  const [result] = await tracker.track(['LE463132624SE', 'LB711320125HK', 'OS803953581BR'])
  console.log(result)
}

trackMultipleCodes()
```

## Result

#### Success ✔

```javascript
[
  {
    code: 'LB711320125HK',
    category: {
      name: 'Prime Importação',
      description: 'Objeto Internacional Prime'
    },
    isDelivered: false,
    postedAt: 2022-03-18T17:55:00.000Z,
    updatedAt: 2022-03-22T22:26:08.000Z,
    events: [
      {
        locality: 'Curitiba / PR',
        status: 'Objeto em trânsito - por favor aguarde',     
        origin: 'Unidade de Tratamento - Curitiba / PR',      
        destination: 'Unidade de Tratamento - São Paulo / SP',
        trackedAt: 2022-03-22T22:26:08.000Z
      },
      {
        locality: 'Curitiba / PR',
        status: 'Fiscalização aduaneira finalizada',
        origin: 'Unidade Operacional - Curitiba / PR',        
        destination: null,
        trackedAt: 2022-03-22T22:24:08.000Z
      },
      {
        locality: 'Curitiba / PR',
        status: 'Objeto recebido pelos Correios do Brasil',   
        origin: 'Unidade Operacional - Curitiba / PR',        
        destination: null,
        trackedAt: 2022-03-22T14:53:37.000Z
      },
      {
        locality: null,
        status: 'Objeto em trânsito - por favor aguarde',
        origin: 'Hong Kong',
        destination: 'Unidade De Tratamento Internacional',
        trackedAt: 2022-03-19T17:03:00.000Z
      },
      {
        locality: null,
        status: 'Objeto postado',
        origin: 'Hong Kong',
        destination: null,
        trackedAt: 2022-03-18T17:55:00.000Z
      }
    ]
  }
]
```

#### Errors ❌

```javascript
// Package was not found.
[
  {
    code: 'LB711320125HK',
    isInvalid: true,
    error: 'not_found'
  }
]
// Package code is invalid.
[
  {
    code: '123ADE',
    isInvalid: true,
    error: 'invalid_code'
  }
]
// Correios service is unavailable.
[
  {
    code: 'LB711320125HK',
    isInvalid: true,
    error: 'service_unavailable'
  }
]
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
**SroCorreios** is fully open and is under [MIT](https://github.com/victoralvesf/sro-correios/blob/master/LICENSE) license.
