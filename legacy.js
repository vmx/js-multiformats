const CID = require('cids')

const legacy = (multiformats, name) => {
  const format = multiformats.multicodec.get(name)
  const serialize = format.encode
  const deserialize = format.decode
  const cid = async (buff, opts) => {
    const defaults = { cidVersion: 1, hashAlg: 'sha2-256' }
    const { cidVersion, hashAlg } = { ...defaults, ...opts }
    const hash = await multiformats.multihash.hash(buff, hashAlg)
    return new CID(cidVersion, name, hash)
  }
  const resolve = (buff, path) => {
    let value = format.decode(buff)
    path = path.split('/').filter(x => x)
    while (path.length) {
      value = value[path.shift()]
      if (typeof value === 'undefined') throw new Error('Not found')
      if (CID.isCID(value)) {
        return { value, remainderPath: path.join('/') }
      }
    }
    return { value }
  }
  const _tree = function * (value, path = []) {
    if (typeof value === 'object') {
      for (const [key, val] of Object.entries(value)) {
        yield ['', ...path, key].join('/')
        if (typeof val === 'object' && !Buffer.isBuffer(val) && !CID.isCID(val)) {
          yield * _tree(val, [...path, key])
        }
      }
    }
  }
  const tree = (buff) => {
    return _tree(format.decode(buff))
  }
  const codec = format.code
  const defaultHashAlg = 'sha2-256'
  const util = { serialize, deserialize, cid }
  const resolver = { resolve, tree }
  return { defaultHashAlg, codec, util, resolver }
}

module.exports = legacy
