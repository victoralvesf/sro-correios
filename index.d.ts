declare module 'sro-correios' {

  export interface Tracking {
    code: string
    category?: Category
    events?: Event[]
    isDelivered?: boolean
    postedAt?: Date
    updatedAt?: Date
    isInvalid?: boolean
    error?: string
  }

  export interface Category {
    name: string | undefined
    description: string | undefined
  }

  export interface Event {
    locality: string | null
    status: string
    origin: string
    destination: string | null
    trackedAt: Date
  }

  export interface Correios {
    objetos: Array<{
      codObjeto: string
      tipoPostal?: {
        categoria: string
        descricao: string
      }
      mensagem?: string
      eventos?: Array<{
        codigo: string
        descricao: string
        dtHrCriado: string
        unidade: CorreiosUnit
        unidadeDestino?: CorreiosUnit
      }>
    }>
  }

  export interface CorreiosUnit {
    endereco: {
      cidade: string
      uf: string
    }
    nome: string
    tipo: string
  }

  export interface PostalType {
    categoria: string
    descricao: string
  }

  export interface CategoryType {
    name: string
    description: string
  }

  export interface Login {
    token: string
  }

  export interface HashSign {
    sign: string
    date: string
  }

  export function track (code: string[]): Promise<Tracking[]>
  export function track (...codes: string[]): Promise<Tracking[]>
  export function isValidOrderCode (code: string): boolean

  export class SroCorreios {
    public track: typeof track
    private readonly requestObject
    private readonly parseResponse
    static isValidOrderCode: typeof isValidOrderCode
  }
}
