const esbuild = require('esbuild')

/** @type {esbuild.CommonOptions} */
const options = {
  target: 'esnext',
  sourcemap: false,
}

/**
 * @param {string} source
 * @param {esbuild.TransformOptions} [overrides]
 */
exports.transform = function (source, overrides = {}) {
  return esbuild.transformSync(source, {
    ...options,
    format: 'cjs',
    ...overrides,
  })
}
