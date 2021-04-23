export default function timingSafeEqual(a: Buffer, b: Buffer) {
  if (!Buffer.isBuffer(a)) {
    throw new TypeError('First argument must be a buffer')
  }
  if (!Buffer.isBuffer(b)) {
    throw new TypeError('Second argument must be a buffer')
  }
  if (a.length !== b.length) {
    throw new TypeError('Input buffers must have the same length')
  }
  var len = a.length
  var out = 0
  var i = -1
  while (++i < len) {
    out |= a[i] ^ b[i]
  }
  return out === 0
}
