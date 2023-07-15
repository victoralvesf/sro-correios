import fetch from 'node-fetch'
import capitalize from 'capitalize'
import crypto from 'crypto'

import { Tracking, Correios, Event, CorreiosUnit, PostalType, CategoryType, Login, HashSign } from 'sro-correios'

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

      const hashSign = this.generateHashSign()

      const loginResponse = await fetch(this.loginUri(), {
        method: 'POST',
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestToken: this.loginToken(),
          data: hashSign.date,
          sign: hashSign.sign
        })
      })
      const { token }: Login = await loginResponse.json()

      const response = await fetch(this.uri(code), {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/json',
          'app-check-token': token
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
      if (postalCode !== undefined) {
        description = description.replace(postalCode, postalCode.toUpperCase())
      }
    }

    return {
      name,
      description
    }
  }

  private generateHashSign (): HashSign {
    const hash = crypto.createHash('md5')

    const date = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }).replace(',', '')
    const hashString = `requestToken${this.loginToken()}data${date}`
    const sign = hash.update(hashString).digest('hex')

    return {
      sign,
      date
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

  private loginUri (): string {
    const url = this.decoder(`
      \x61\x48\x52\x30\x63\x48\x4d\x36\x4c\x79\x39\x77\x63\x6d
      \x39\x34\x65\x57\x46\x77\x63\x43\x35\x6a\x62\x33\x4a\x79
      \x5a\x57\x6c\x76\x63\x79\x35\x6a\x62\x32\x30\x75\x59\x6e
      \x49\x76\x64\x6a\x45\x76\x59\x58\x42\x77\x4c\x58\x5a\x68
      \x62\x47\x6c\x6b\x59\x58\x52\x70\x62\x32\x34\x3d
    `).replace('v1', 'v2')
    return url
  }

  private loginToken (): string {
    const token = this.decoder(`
      \x57\x56\x63\x31\x61\x32\x4e\x74\x4f\x58\x42\x61\x52\x48
      \x52\x70\x59\x32\x6b\x31\x61\x6d\x49\x79\x4d\x48\x56\x5a
      \x4d\x6a\x6c\x35\x59\x32\x31\x57\x63\x47\x49\x7a\x54\x58
      \x56\x6a\x53\x45\x70\x73\x57\x56\x68\x53\x62\x47\x4a\x74
      \x55\x6e\x42\x69\x56\x31\x5a\x31\x5a\x45\x63\x34\x4e\x31
      \x4a\x71\x54\x58\x6c\x53\x56\x45\x6b\x31\x54\x31\x52\x6a
      \x4d\x6b\x35\x36\x51\x54\x56\x4e\x65\x6c\x55\x31\x54\x30
      \x52\x56\x4e\x56\x4a\x55\x51\x6b\x4e\x50\x56\x47\x52\x48
      \x54\x6d\x74\x5a\x4e\x46\x46\x55\x55\x54\x52\x4e\x4d\x45
      \x6b\x31\x55\x57\x70\x72\x4d\x55\x31\x36\x56\x54\x4e\x50
      \x51\x54\x30\x39
    `)
    return token
  }

  private get userAgent (): string {
    const UAS = this.decoder(`
      \x52\x47\x46\x79\x64\x43\x38\x79\x4c\x6a\x45\x34\x49\x43
      \x68\x6b\x59\x58\x4a\x30\x4f\x6d\x6c\x76\x4b\x51\x3d\x3d
    `)

    return UAS
  }

  private decoder (value: string): string {
    return Buffer.from(value, '\x62\x61\x73\x65\x36\x34').toString('utf-8')
  };
}
