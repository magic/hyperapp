import { version } from '@magic/test'

import * as imports from '../src/index.mjs'

const spec = {
  Lazy: 'fn',
  app: 'fn',
  h: 'fn',
  hyperapp: 'module',
  Lazy: 'fn',
  app: 'fn',
  h: 'fn',
  renderToStream: 'fn',
  renderToString: 'fn',
}

export default version(imports, spec)
