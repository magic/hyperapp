import type { Test } from '@magic/test'

import {
  concatClassNames,
  escapeHtml,
  hyphenateStyleName,
  renderToStream,
  renderToString,
  renderer,
  stringifyStyles,
} from '../src/render.mjs'

/** Collect the full contents of a readable stream as a string. */
const readStream = (stream: NodeJS.ReadableStream) =>
  new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', chunk => chunks.push(Buffer.from(chunk)))
    stream.on('end', () => resolve(Buffer.concat(chunks).toString()))
    stream.on('error', reject)
  })

const dispatch = () => {}

export default [
  // ---- escapeHtml -------------------------------------------------------
  { fn: () => escapeHtml(42), expect: '42', info: 'escapeHtml: number returned as string' },
  { fn: () => escapeHtml('hello'), expect: 'hello', info: 'escapeHtml: no special chars' },
  {
    fn: () => escapeHtml('"&\'<>'),
    expect: '&quot;&amp;&#39;&lt;&gt;',
    info: 'escapeHtml: all five special chars',
  },
  { fn: () => escapeHtml('<a'), expect: '&lt;a', info: 'escapeHtml: leading special char' },
  {
    fn: () => escapeHtml('a<b'),
    expect: 'a&lt;b',
    info: 'escapeHtml: normal char after special (default loop branch)',
  },
  { fn: () => escapeHtml('a<'), expect: 'a&lt;', info: 'escapeHtml: string ends with special' },
  {
    fn: () => escapeHtml('1<2 & 3>4 "5" \'6\''),
    expect: '1&lt;2 &amp; 3&gt;4 &quot;5&quot; &#39;6&#39;',
    info: 'escapeHtml: mixed content',
  },

  // ---- concatClassNames -------------------------------------------------
  { fn: () => concatClassNames('foo'), expect: 'foo', info: 'concatClassNames: plain string' },
  { fn: () => concatClassNames(''), expect: '', info: 'concatClassNames: empty string' },
  { fn: () => concatClassNames(0), expect: '', info: 'concatClassNames: falsy number' },
  { fn: () => concatClassNames(42), expect: 42, info: 'concatClassNames: truthy number' },
  { fn: () => concatClassNames(['a', 'b']), expect: 'a b', info: 'concatClassNames: array' },
  {
    fn: () => concatClassNames(['a', '', 'b']),
    expect: 'a b',
    info: 'concatClassNames: array with empty',
  },
  { fn: () => concatClassNames([]), expect: '', info: 'concatClassNames: empty array' },
  {
    fn: () => concatClassNames(['a', { b: true, c: false }, 'd']),
    expect: 'a b d',
    info: 'concatClassNames: nested array of mixed values',
  },
  {
    fn: () => concatClassNames({ a: true, b: false }),
    expect: 'a',
    info: 'concatClassNames: object with falsy entry skipped',
  },
  {
    fn: () => concatClassNames({ a: 1, b: 2 }),
    expect: 'a b',
    info: 'concatClassNames: object truthy',
  },
  { fn: () => concatClassNames({}), expect: '', info: 'concatClassNames: empty object' },

  // ---- hyphenateStyleName ----------------------------------------------
  {
    fn: () => hyphenateStyleName('backgroundColor'),
    expect: 'background-color',
    info: 'hyphenateStyleName: camelCase to kebab',
  },
  {
    fn: () => hyphenateStyleName('backgroundColor'),
    expect: 'background-color',
    info: 'hyphenateStyleName: second call hits the cache',
  },
  {
    fn: () => hyphenateStyleName('MozTransition'),
    expect: '-moz-transition',
    info: 'hyphenateStyleName: uppercase vendor prefix',
  },
  {
    fn: () => hyphenateStyleName('msTransform'),
    expect: '-ms-transform',
    info: 'hyphenateStyleName: ms vendor prefix',
  },
  { fn: () => hyphenateStyleName('color'), expect: 'color', info: 'hyphenateStyleName: no change' },

  // ---- stringifyStyles --------------------------------------------------
  { fn: () => stringifyStyles({}), expect: '', info: 'stringifyStyles: empty object' },
  {
    fn: () => stringifyStyles({ color: 'red' }),
    expect: 'color:red',
    info: 'stringifyStyles: single property',
  },
  {
    fn: () => stringifyStyles({ color: 'red', backgroundColor: 'blue' }),
    expect: 'color:red;background-color:blue',
    info: 'stringifyStyles: multiple properties',
  },
  {
    fn: () => stringifyStyles({ color: 'red', display: null }),
    expect: 'color:red',
    info: 'stringifyStyles: null value skipped',
  },
  {
    fn: () => stringifyStyles({ cssText: 'color:red' }),
    expect: 'color:red',
    info: 'stringifyStyles: cssText passthrough',
  },
  {
    fn: () => stringifyStyles({ cssText: 'a:b', color: 'red' }),
    expect: 'a:b;color:red',
    info: 'stringifyStyles: cssText mixed with properties',
  },

  // ---- renderToString ---------------------------------------------------
  {
    fn: () => renderToString(() => 'plain', null, dispatch),
    expect: 'plain',
    info: 'renderToString: view returning text',
  },
  {
    fn: () => renderToString(() => '<b>&', null, dispatch),
    expect: '&lt;b&gt;&amp;',
    info: 'renderToString: text is escaped',
  },
  {
    fn: () => renderToString(() => 42, null, dispatch),
    expect: '42',
    info: 'renderToString: view returning a number',
  },
  {
    fn: () => renderToString(() => [null, true, false, 'x'], null, dispatch),
    expect: 'x',
    info: 'renderToString: null and booleans are skipped',
  },
  {
    fn: () => renderToString(() => ['a', 'b', 'c'], null, dispatch),
    expect: 'abc',
    info: 'renderToString: array of text',
  },
  {
    fn: () =>
      renderToString(
        () => ({ tag: 'div', props: {}, children: [{ tag: 'span', props: {}, children: ['hi'] }] }),
        null,
        dispatch,
      ),
    expect: '<div><span>hi</span></div>',
    info: 'renderToString: nested elements',
  },
  {
    fn: () =>
      renderToString(
        () => ({
          tag: 'div',
          props: {
            id: 'x',
            class: ['a', { b: true, c: false }],
            style: { color: 'red', msTransform: 'scale(1)' },
            disabled: true,
            hidden: false,
            key: 'k',
            onClick: () => {},
            innerHTML: 'nope',
            __source: 1,
          },
          children: ['x'],
        }),
        null,
        dispatch,
      ),
    expect: '<div id="x" class="a b" style="color:red;-ms-transform:scale(1)" disabled>x</div>',
    info: 'renderToString: props, classes, styles, boolean attrs, ignored props',
  },
  {
    fn: () =>
      renderToString(
        () => ({ tag: 'img', props: { src: '/x.png' }, children: [] }),
        null,
        dispatch,
      ),
    expect: '<img src="/x.png"/>',
    info: 'renderToString: void element self-closes',
  },
  {
    fn: () =>
      renderToString(() => ({ tag: 'div', props: { innerHTML: '<b>hi</b>' } }), null, dispatch),
    expect: '<div><b>hi</b></div>',
    info: 'renderToString: innerHTML rendered raw',
  },
  {
    fn: () => renderToString(() => ({ type: 'div', attributes: { id: 'legacy' } }), null, dispatch),
    expect: '<div id="legacy"></div>',
    info: 'renderToString: legacy type + attributes node',
  },
  {
    fn: () => renderToString(() => ({ nodeName: 'section' }), null, dispatch),
    expect: '<section></section>',
    info: 'renderToString: legacy nodeName node',
  },
  {
    fn: () => renderToString(() => ({ tag: 3, type: '<text>' }), null, dispatch),
    expect: '&lt;text&gt;',
    info: 'renderToString: tag 3 node renders type',
  },
  {
    fn: () => renderToString(() => ({ type: 3, tag: 'hello' }), null, dispatch),
    expect: 'hello',
    info: 'renderToString: type 3 node renders tag string',
  },
  {
    fn: () => renderToString(() => ({ type: 3, name: 'world' }), null, dispatch),
    expect: 'world',
    info: 'renderToString: type 3 node falls back to name',
  },
  {
    fn: () => renderToString(() => ({ tag: () => 'from memo', memo: {} }), null, dispatch),
    expect: 'from memo',
    info: 'renderToString: memoized view (tag as function)',
  },
  {
    fn: () => renderToString(() => ({ type: 2, lazy: { view: () => 'lazy out' } }), null, dispatch),
    expect: 'lazy out',
    info: 'renderToString: lazy view',
  },
  {
    fn: () => renderToString((state: { msg: string }) => state.msg, { msg: 'statey' }, dispatch),
    expect: 'statey',
    info: 'renderToString: view receives state',
  },
  {
    fn: () => renderToString(() => [() => 'nested view', [1, 2]], null, dispatch),
    expect: 'nested view12',
    info: 'renderToString: nested array and view function',
  },

  {
    fn: () =>
      renderToString(() => ({ tag: 'div', props: { class: '' }, children: [] }), null, dispatch),
    expect: '<div></div>',
    info: 'renderToString: empty class value is omitted',
  },
  {
    fn: () =>
      renderToString(() => ({ tag: 'div', props: { style: {} }, children: [] }), null, dispatch),
    expect: '<div></div>',
    info: 'renderToString: empty style object is omitted',
  },
  {
    fn: () => renderToString(() => 10n, null, dispatch),
    expect: '10',
    info: 'renderToString: bigint renders through escapeHtml',
  },

  // ---- renderer (byte budget) ------------------------------------------
  {
    fn: () => {
      const read = renderer(() => ['a', 'b', 'c', 'd', 'e', 'f'], null, dispatch)
      return read(2) + read(2) + read(2)
    },
    expect: 'abcdef',
    info: 'renderer: honors the byte budget across calls',
  },
  {
    fn: () => {
      const read = renderer(() => 'ab', null, dispatch)
      read(10)
      return read(10)
    },
    expect: null,
    info: 'renderer: returns null once finished',
  },

  // ---- renderToStream ---------------------------------------------------
  {
    fn: async () => {
      const stream = renderToStream(() => 'streamed', null, dispatch)
      return readStream(stream)
    },
    expect: 'streamed',
    info: 'renderToStream: streams the rendered html',
  },
  {
    fn: async () => {
      const stream = renderToStream(
        () => ({ tag: 'div', props: { id: 's' }, children: ['in'] }),
        null,
        dispatch,
      )
      return readStream(stream)
    },
    expect: '<div id="s">in</div>',
    info: 'renderToStream: renders elements',
  },
  {
    fn: async () => {
      const boom = new Error('view exploded')
      const stream = renderToStream(
        () => {
          throw boom
        },
        null,
        dispatch,
      )
      const err = await new Promise<unknown>(resolve => {
        stream.on('data', () => {})
        stream.on('error', (e: unknown) => resolve(e))
      })
      return err
    },
    expect: (err: unknown) => err instanceof Error && err.message === 'view exploded',
    info: 'renderToStream: emits an error when the view throws',
  },
] satisfies Test[]
