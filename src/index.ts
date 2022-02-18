import { SroCorreios } from './sro-correios'

export = {
  SroCorreios,
  get track () {
    const instance = new SroCorreios()
    return instance.track.bind(instance)
  },
  isValidOrderCode: SroCorreios.isValidOrderCode
}
