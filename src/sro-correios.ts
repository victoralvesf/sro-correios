import fetch from 'node-fetch'
import capitalize from 'capitalize'

import { Tracking, Correios, Event, CorreiosUnit, PostalType, CategoryType } from 'sro-correios'

interface ParsedLocation {
  locality: string | null
  origin: string
}

export class SroCorreios {
  private readonly PARALLEL_TRACKS = 10

  public async track (...codes: string[]): Promise<Tracking[]> {
    const flatCodes = codes.flat()

    const chunkSize = Math.ceil(flatCodes.length / this.PARALLEL_TRACKS)
    const tracks: Tracking[] = []

    for (let i = 0; i < chunkSize; i++) {
      const results: Tracking[] = await Promise.all(
        flatCodes.slice(this.PARALLEL_TRACKS * i, this.PARALLEL_TRACKS * (i + 1)).map(this.requestObject.bind(this))
      )
      tracks.push(...results)
    }

    return tracks
  }

  public static isValidOrderCode = (code: string): boolean => /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/.test(code)

  private async requestObject (code: string): Promise<Tracking> {
    try {
      if (!SroCorreios.isValidOrderCode(code)) {
        return {
          code,
          isInvalid: true,
          error: 'invalid_code'
        }
      }

      const response = await fetch(this.uri(code), {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/json'
        }
      })
      const data: Correios = await response.json()

      return this.parseResponse(data, code)
    } catch (error) {
      return {
        code,
        isInvalid: true,
        error: 'service_unavailable'
      }
    }
  }

  private parseResponse (data: Correios, code: string): Tracking {
    if (data.objetos[0].mensagem !== undefined || data.objetos[0].eventos === undefined) {
      return {
        code,
        isInvalid: true,
        error: 'not_found'
      }
    }

    const events: Event[] = []

    data.objetos[0].eventos.forEach(event => {
      const locality: string | null = this.locationRules(event.unidade).locality
      const origin: string | null = this.locationRules(event.unidade).origin

      let destination: string | null = null

      if (event.unidadeDestino !== undefined) {
        destination = this.locationRules(event.unidadeDestino).origin
      }

      events.push({
        locality,
        status: event.descricao,
        origin,
        destination,
        trackedAt: new Date(event.dtHrCriado)
      })
    })

    const [lastEvent, firstEvent] = [events[0], events[events.length - 1]]

    const isDelivered = lastEvent.status.includes('Objeto entregue')

    const category = this.parseCategory(data.objetos[0].tipoPostal)

    return {
      code,
      category,
      isDelivered,
      postedAt: firstEvent.trackedAt,
      updatedAt: lastEvent.trackedAt,
      events
    }
  }

  private parseLocation (unit: CorreiosUnit): ParsedLocation {
    const city: string = capitalize(unit.endereco.cidade)
    const locality: string = `${city} / ${unit.endereco.uf}`
    const origin: string = `${unit.tipo} - ${locality}`

    return {
      locality,
      origin
    }
  }

  private parseInternationalLocation (unit: CorreiosUnit): ParsedLocation {
    const origin: string = capitalize.words(unit.nome)

    return {
      locality: null,
      origin
    }
  }

  private locationRules (unit: CorreiosUnit): ParsedLocation {
    if (unit.tipo === 'País') {
      return this.parseInternationalLocation(unit)
    } else {
      return this.parseLocation(unit)
    }
  }

  private parseCategory (postalType: PostalType | undefined): CategoryType {
    if (postalType === undefined) {
      return {
        name: 'Desconhecido',
        description: 'Não identificado'
      }
    }

    const name = capitalize.words(postalType?.categoria ?? 'Desconhecido')
    let description = capitalize.words(postalType?.descricao ?? 'Não identificado')

    if (!description.includes('identificado') && !description.includes('Internacional')) {
      const postalCode = description.split(' ').filter(word => word.length === 2)[0]
      description = description.replace(postalCode, postalCode.toUpperCase())
    }

    return {
      name,
      description
    }
  }

  private uri (code: string): string {
    const baseUrl = this.decoder(`
      \x61\x48\x52\x30\x63\x48\x4d\x36\x4c\x79\x39\x77\x63
      \x6d\x39\x34\x65\x57\x46\x77\x63\x43\x35\x6a\x62\x33
      \x4a\x79\x5a\x57\x6c\x76\x63\x79\x35\x6a\x62\x32\x30
      \x75\x59\x6e\x49\x76\x64\x6a\x45\x76\x63\x33\x4a\x76
      \x4c\x58\x4a\x68\x63\x33\x52\x79\x62\x79\x38\x3d
    `)
    return baseUrl + code
  }

  private get userAgent (): string {
    const UAS = [
      '\x54\x57\x39\x36\x61\x57\x78\x73\x59\x53\x38\x31\x4c\x6a\x41\x67\x4b\x46\x64\x70\x62\x6d\x52\x76\x64\x33\x4d\x67\x54\x6c\x51\x67\x4d\x54\x41\x75\x4d\x44\x73\x67\x56\x32\x6c\x75\x4e\x6a\x51\x37\x49\x48\x67\x32\x4e\x43\x6b\x67\x51\x58\x42\x77\x62\x47\x56\x58\x5a\x57\x4a\x4c\x61\x58\x51\x76\x4e\x54\x4d\x33\x4c\x6a\x4d\x32\x49\x43\x68\x4c\x53\x46\x52\x4e\x54\x43\x77\x67\x62\x47\x6c\x72\x5a\x53\x42\x48\x5a\x57\x4e\x72\x62\x79\x6b\x67\x51\x32\x68\x79\x62\x32\x31\x6c\x4c\x7a\x6b\x33\x4c\x6a\x41\x75\x4e\x44\x59\x35\x4d\x69\x34\x35\x4f\x53\x42\x54\x59\x57\x5a\x68\x63\x6d\x6b\x76\x4e\x54\x4d\x33\x4c\x6a\x4d\x32',
      '\x54\x57\x39\x36\x61\x57\x78\x73\x59\x53\x38\x31\x4c\x6a\x41\x67\x4b\x46\x64\x70\x62\x6d\x52\x76\x64\x33\x4d\x67\x54\x6c\x51\x67\x4d\x54\x41\x75\x4d\x44\x73\x67\x56\x32\x6c\x75\x4e\x6a\x51\x37\x49\x48\x67\x32\x4e\x44\x73\x67\x63\x6e\x59\x36\x4f\x54\x55\x75\x4d\x43\x6b\x67\x52\x32\x56\x6a\x61\x32\x38\x76\x4d\x6a\x41\x78\x4d\x44\x41\x78\x4d\x44\x45\x67\x52\x6d\x6c\x79\x5a\x57\x5a\x76\x65\x43\x38\x35\x4e\x53\x34\x77',
      '\x54\x57\x39\x36\x61\x57\x78\x73\x59\x53\x38\x31\x4c\x6a\x41\x67\x4b\x46\x64\x70\x62\x6d\x52\x76\x64\x33\x4d\x67\x54\x6c\x51\x67\x4d\x54\x41\x75\x4d\x44\x73\x67\x56\x32\x6c\x75\x4e\x6a\x51\x37\x49\x48\x67\x32\x4e\x43\x6b\x67\x51\x58\x42\x77\x62\x47\x56\x58\x5a\x57\x4a\x4c\x61\x58\x51\x76\x4e\x54\x4d\x33\x4c\x6a\x4d\x32\x49\x43\x68\x4c\x53\x46\x52\x4e\x54\x43\x77\x67\x62\x47\x6c\x72\x5a\x53\x42\x48\x5a\x57\x4e\x72\x62\x79\x6b\x67\x51\x32\x68\x79\x62\x32\x31\x6c\x4c\x7a\x6b\x77\x4c\x6a\x41\x75\x4e\x44\x51\x7a\x4d\x43\x34\x35\x4d\x79\x42\x54\x59\x57\x5a\x68\x63\x6d\x6b\x76\x4e\x54\x4d\x33\x4c\x6a\x4d\x32',
      '\x54\x57\x39\x36\x61\x57\x78\x73\x59\x53\x38\x31\x4c\x6a\x41\x67\x4b\x46\x64\x70\x62\x6d\x52\x76\x64\x33\x4d\x67\x54\x6c\x51\x67\x4d\x54\x41\x75\x4d\x44\x73\x67\x56\x32\x6c\x75\x4e\x6a\x51\x37\x49\x48\x67\x32\x4e\x43\x6b\x67\x51\x58\x42\x77\x62\x47\x56\x58\x5a\x57\x4a\x4c\x61\x58\x51\x76\x4e\x54\x4d\x33\x4c\x6a\x4d\x32\x49\x43\x68\x4c\x53\x46\x52\x4e\x54\x43\x77\x67\x62\x47\x6c\x72\x5a\x53\x42\x48\x5a\x57\x4e\x72\x62\x79\x6b\x67\x51\x32\x68\x79\x62\x32\x31\x6c\x4c\x7a\x6b\x32\x4c\x6a\x41\x75\x4e\x44\x59\x32\x4e\x43\x34\x78\x4d\x54\x41\x67\x55\x32\x46\x6d\x59\x58\x4a\x70\x4c\x7a\x55\x7a\x4e\x79\x34\x7a\x4e\x69\x42\x46\x5a\x47\x63\x76\x4f\x54\x59\x75\x4d\x43\x34\x78\x4d\x44\x55\x30\x4c\x6a\x59\x79',
      '\x54\x57\x39\x36\x61\x57\x78\x73\x59\x53\x38\x31\x4c\x6a\x41\x67\x4b\x46\x64\x70\x62\x6d\x52\x76\x64\x33\x4d\x67\x54\x6c\x51\x67\x4d\x54\x41\x75\x4d\x44\x73\x67\x56\x32\x6c\x75\x4e\x6a\x51\x37\x49\x48\x67\x32\x4e\x44\x73\x67\x63\x6e\x59\x36\x4f\x54\x51\x75\x4d\x43\x6b\x67\x52\x32\x56\x6a\x61\x32\x38\x76\x4d\x6a\x41\x78\x4d\x44\x41\x78\x4d\x44\x45\x67\x52\x6d\x6c\x79\x5a\x57\x5a\x76\x65\x43\x38\x35\x4e\x43\x34\x77'
    ]

    return this.decoder(UAS[Math.floor(Math.random() * UAS.length)])
  }

  private decoder (value: string): string {
    return Buffer.from(value, '\x62\x61\x73\x65\x36\x34').toString('utf-8')
  };
}
