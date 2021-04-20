const { transform } = require('./esbuild')

const loadCJS = require.extensions['.js']

/**
 * @param {string} extn
 * @param {string} loader
 */
function loader(extn, loader) {
  require.extensions[extn] = function (Module, filename) {
    const pitch = Module._compile.bind(Module)

    Module._compile = (source) => {
      const { code, warnings } = transform(source, {
        sourcefile: filename,
        loader: loader,
      })

      warnings.forEach((msg) => {
        console.warn(`\nesbuild warning in ${filename}:`)
        console.warn(msg.location)
        console.warn(msg.text)
      })

      return pitch(code, filename)
    }

    loadCJS(Module, filename)
  }
}

loader('.ts', 'ts')
loader('.mjs', 'js')
loader('.cjs', 'js')
