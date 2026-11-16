import { version } from '@magic/test'

import * as imports from '../src/index.mjs'

const spec = {
  hyperapp: 'module',
  app: 'fn',
  h: 'fn',
  memo: 'fn',
  text: 'fn',
  renderToStream: 'fn',
  renderToString: 'fn',
}

export default version(imports, spec)
