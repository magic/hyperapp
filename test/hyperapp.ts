import type { Test } from '@magic/test'
import { is } from '@magic/test'

import {
  app,
  createClass,
  createNode,
  createVNode,
  getKey,
  h,
  maybeVNode,
  memo,
  patch,
  patchProperty,
  patchSubs,
  propsChanged,
  recycleNode,
  shouldRestart,
  text,
} from '../src/hyperapp.mjs'

/** Wait for the next animation frame (hyperapp renders on rAF). */
const frame = () => new Promise<void>(resolve => setTimeout(resolve, 25))

/** Fresh mount host appended to the document body. */
const host = (tag = 'div') => {
  const el = document.createElement(tag)
  document.body.appendChild(el)
  return el
}

export default [
  // ---- createClass ------------------------------------------------------
  { fn: () => createClass('foo'), expect: 'foo', info: 'createClass: string passthrough' },
  { fn: () => createClass(['a', 'b']), expect: 'a b', info: 'createClass: array' },
  {
    fn: () => createClass(['a', '', null, 'b']),
    expect: 'a b',
    info: 'createClass: array with falsy entries',
  },
  {
    fn: () => createClass(['a', ['b', 'c'], 'd']),
    expect: 'a b c d',
    info: 'createClass: nested array',
  },
  {
    fn: () => createClass({ a: true, b: false, c: 1 }),
    expect: 'a c',
    info: 'createClass: object flags',
  },
  { fn: () => createClass({}), expect: '', info: 'createClass: empty object' },
  {
    fn: () => createClass(0),
    expect: '',
    info: 'createClass: non-string non-array falls to object path',
  },

  // ---- shouldRestart ----------------------------------------------------
  {
    fn: () => {
      const b: Record<string, unknown> = {}
      const fn = () => {}
      shouldRestart({ fn }, b)
      return b.fn === fn
    },
    expect: true,
    info: 'shouldRestart: function value is carried over',
  },
  {
    fn: () => {
      const b: Record<string, unknown> = {}
      const fn = () => {}
      shouldRestart({ sub: [fn, 1] }, b)
      return b.sub !== undefined
    },
    expect: true,
    info: 'shouldRestart: array whose head is a function is carried over',
  },
  {
    fn: () => shouldRestart({ x: 1 }, { x: 2 }),
    expect: true,
    info: 'shouldRestart: differing value',
  },
  {
    fn: () => shouldRestart({ x: 1 }, { x: 1 }),
    expect: is.undef,
    info: 'shouldRestart: equal values',
  },
  {
    fn: () => shouldRestart({ sub: [1, 2] }, { sub: [3, 4] }),
    expect: true,
    info: 'shouldRestart: non-function array head, differing',
  },

  // ---- patchSubs --------------------------------------------------------
  {
    fn: () => patchSubs([], [], () => {}),
    expect: is.deep.equal([]),
    info: 'patchSubs: both empty',
  },
  {
    fn: () => {
      const unsub = { n: 0 }
      const listener = () => () => {
        unsub.n++
      }
      const out = patchSubs([], [[listener, { n: 1 }, null]], () => {})
      return out.length === 1 && out[0][0] === listener
    },
    expect: true,
    info: 'patchSubs: new subscription is started',
  },
  {
    fn: () => {
      const u1 = () => {}
      const listener = () => u1
      const old = [[listener, { n: 1 }, u1]]
      const out = patchSubs(old, [[listener, { n: 1 }, null]], () => {})
      return out[0] === old[0]
    },
    expect: true,
    info: 'patchSubs: unchanged subscription is kept',
  },
  {
    fn: () => {
      let disposed = 0
      const u1 = () => {
        disposed++
      }
      const l1 = () => u1
      const l2 = () => () => {}
      patchSubs([[l1, { n: 1 }, u1]], [[l2, { n: 1 }, null]], () => {})
      return disposed === 1
    },
    expect: true,
    info: 'patchSubs: changed subscriber disposes the old one',
  },
  {
    fn: () => {
      let disposed = 0
      const u1 = () => {
        disposed++
      }
      const listener = () => u1
      patchSubs([[listener, { n: 1 }, u1]], [[listener, { n: 2 }, null]], () => {})
      return disposed === 1
    },
    expect: true,
    info: 'patchSubs: changed payload restarts the subscription',
  },
  {
    fn: () => {
      let disposed = 0
      const u1 = () => {
        disposed++
      }
      const listener = () => u1
      patchSubs([[listener, { n: 1 }, u1]], [true], () => {})
      return disposed === 1
    },
    expect: true,
    info: 'patchSubs: newSub === true stops the subscription',
  },
  {
    fn: () => {
      let disposed = 0
      const u1 = () => {
        disposed++
      }
      const listener = () => u1
      patchSubs([[listener, { n: 1 }, u1]], [], () => {})
      return disposed === 1
    },
    expect: true,
    info: 'patchSubs: removed subscription is disposed',
  },
  {
    fn: () => {
      let disposed = 0
      const u1 = () => {
        disposed++
      }
      const listener = () => u1
      patchSubs([[listener, { n: 1 }, u1]], () => {})
      return disposed === 1
    },
    expect: true,
    info: 'patchSubs: omitted newSubs defaults to empty and disposes',
  },
  {
    fn: () => {
      const out = patchSubs([], [true], () => {})
      return out[0] === undefined
    },
    expect: true,
    info: 'patchSubs: true with no previous sub pushes undefined',
  },

  // ---- getKey -----------------------------------------------------------
  { fn: () => getKey(null), expect: null, info: 'getKey: null' },
  { fn: () => getKey(undefined), expect: is.undef, info: 'getKey: undefined' },
  { fn: () => getKey({ key: 'a' }), expect: 'a', info: 'getKey: returns key' },
  { fn: () => getKey({}), expect: is.undef, info: 'getKey: no key' },

  // ---- propsChanged -----------------------------------------------------
  { fn: () => propsChanged({ a: 1 }, { a: 1 }), expect: is.undef, info: 'propsChanged: equal' },
  {
    fn: () => propsChanged({ a: 1 }, { a: 2 }),
    expect: true,
    info: 'propsChanged: differing value',
  },
  { fn: () => propsChanged({ a: 1 }, { b: 1 }), expect: true, info: 'propsChanged: key only in b' },
  { fn: () => propsChanged({ a: 1 }, {}), expect: true, info: 'propsChanged: key only in a' },
  {
    fn: () => propsChanged({ a: 1 }, { a: 1, b: 2 }),
    expect: true,
    info: 'propsChanged: extra key in b',
  },
  { fn: () => propsChanged({}, {}), expect: is.undef, info: 'propsChanged: both empty' },

  // ---- createVNode / memo / text / h ------------------------------------
  {
    fn: () => createVNode('div', { id: 'x', key: 'k' }, [], 1, null),
    expect: { tag: 'div', props: { id: 'x' }, key: 'k', children: [], type: 1, node: null },
    info: 'createVNode: builds a vnode',
  },
  {
    fn: () => createVNode('div', {}, [], undefined, undefined),
    expect: {
      tag: 'div',
      props: {},
      key: undefined,
      children: [],
      type: undefined,
      node: undefined,
    },
    info: 'createVNode: without key/type/node',
  },
  {
    fn: () => {
      const view = () => h('span', {}, [])
      const m = memo(view, { n: 1 })
      return m.tag === view && m.memo !== undefined
    },
    expect: true,
    info: 'memo: stores view and data',
  },
  {
    fn: () => {
      const t = text('hi')
      return t.tag === 'hi' && t.type === 3 && t.children.length === 0
    },
    expect: true,
    info: 'text: builds a text vnode',
  },
  {
    fn: () => {
      const v = h('div', { id: 'x' }, [])
      return v.tag === 'div' && v.props.id === 'x' && v.children.length === 0
    },
    expect: true,
    info: 'h: element with props and empty children',
  },
  {
    fn: () => {
      const v = h('div', { class: ['a', { b: true, c: false }] })
      return v.props.class === 'a b'
    },
    expect: true,
    info: 'h: class is normalized via createClass',
  },
  {
    fn: () => {
      const v = h('div', {}, 'single')
      return v.children.length === 1 && v.children[0].tag === 'single' && v.children[0].type === 3
    },
    expect: true,
    info: 'h: single child is wrapped in an array',
  },
  {
    fn: () => {
      const v = h('div', {}, [text('a'), text('b')])
      return v.children.length === 2
    },
    expect: true,
    info: 'h: array of children kept as-is',
  },
  {
    fn: () => {
      const v = h('div', {})
      return v.children.length === 0
    },
    expect: true,
    info: 'h: children default to empty',
  },

  // ---- maybeVNode -------------------------------------------------------
  { fn: () => maybeVNode(true).tag, expect: '', info: 'maybeVNode: true becomes empty text' },
  { fn: () => maybeVNode(false).tag, expect: '', info: 'maybeVNode: false becomes empty text' },
  { fn: () => maybeVNode(null).tag, expect: '', info: 'maybeVNode: null becomes empty text' },
  {
    fn: () => maybeVNode(undefined).tag,
    expect: '',
    info: 'maybeVNode: undefined becomes empty text',
  },
  {
    fn: () => {
      const el = h('span', {}, [])
      return maybeVNode(el) === el
    },
    expect: true,
    info: 'maybeVNode: plain vnode passes through',
  },
  {
    fn: () => {
      const view = d => h('span', {}, [text(String(d.n))])
      const fresh = maybeVNode(memo(view, { n: 1 }))
      return fresh !== undefined && fresh.memo !== undefined
    },
    expect: true,
    info: 'maybeVNode: memoized view resolves with no old node',
  },
  {
    fn: () => {
      const view = d => h('span', {}, [text(String(d.n))])
      const cached = maybeVNode(memo(view, { n: 1 }))
      const again = maybeVNode(memo(view, { n: 1 }), cached)
      return again === cached
    },
    expect: true,
    info: 'maybeVNode: unchanged memo reuses the cached vnode',
  },
  {
    fn: () => {
      const view = d => h('span', {}, [text(String(d.n))])
      const cached = maybeVNode(memo(view, { n: 1 }))
      const recomputed = maybeVNode(memo(view, { n: 2 }), cached)
      return recomputed !== cached && recomputed.memo !== undefined
    },
    expect: true,
    info: 'maybeVNode: changed memo recomputes the view',
  },
  {
    fn: () => {
      const view = d => h('span', {}, [text(String(d.n))])
      const plain = h('span', {}, [])
      const recomputed = maybeVNode(memo(view, { n: 1 }), plain)
      return recomputed !== plain
    },
    expect: true,
    info: 'maybeVNode: old node without memo recomputes',
  },
  {
    fn: () => {
      const vnode = maybeVNode('hello')
      return vnode.tag === 'hello' && vnode.type === 3 && Array.isArray(vnode.children)
    },
    expect: true,
    info: 'maybeVNode: raw string becomes a text vnode',
  },
  {
    fn: () => {
      const vnode = maybeVNode(42)
      return vnode.tag === 42 && vnode.type === 3
    },
    expect: true,
    info: 'maybeVNode: raw number becomes a text vnode',
  },
  {
    fn: () => {
      const vnode = maybeVNode('x')
      return vnode.type === 3 && vnode.children.length === 0
    },
    expect: true,
    info: 'maybeVNode: string text vnode has empty children',
  },

  // ---- patchProperty ----------------------------------------------------
  {
    fn: () => {
      const el = document.createElement('div')
      patchProperty(el, 'style', null, { color: 'red', '-webkit-box-shadow': 'none' }, null, false)
      return el.style.color === 'red'
    },
    expect: true,
    info: 'patchProperty: style object (normal + custom property)',
  },
  {
    fn: () => {
      const el = document.createElement('div')
      el.style.color = 'red'
      patchProperty(el, 'style', { color: 'red' }, { color: null }, null, false)
      return el.style.color === ''
    },
    expect: true,
    info: 'patchProperty: null style value cleared',
  },
  {
    fn: () => {
      const el = document.createElement('div')
      const listener = () => {}
      patchProperty(el, 'onclick', null, listener, listener, false)
      return el.events !== undefined && el.events.click === listener
    },
    expect: true,
    info: 'patchProperty: event listener added',
  },
  {
    fn: () => {
      const el = document.createElement('div')
      const listener = () => {}
      patchProperty(el, 'onclick', null, listener, listener, false)
      patchProperty(el, 'onclick', listener, null, listener, false)
      return el.events.click === null
    },
    expect: true,
    info: 'patchProperty: event listener removed',
  },
  {
    fn: () => {
      const el = document.createElement('div')
      const listener = () => {}
      patchProperty(el, 'onclick', listener, listener, listener, false)
      return true
    },
    expect: true,
    info: 'patchProperty: unchanged listener is a no-op',
  },
  {
    fn: () => {
      const el = document.createElement('div')
      patchProperty(el, 'id', null, 'myid', null, false)
      return el.id === 'myid'
    },
    expect: true,
    info: 'patchProperty: known DOM property is assigned',
  },
  {
    fn: () => {
      const el = document.createElement('div')
      el.id = 'x'
      patchProperty(el, 'id', 'x', null, null, false)
      return el.id === ''
    },
    expect: true,
    info: 'patchProperty: null property becomes empty string',
  },
  {
    fn: () => {
      const el = document.createElement('div')
      patchProperty(el, 'data-foo', null, 'bar', null, false)
      return el.getAttribute('data-foo') === 'bar'
    },
    expect: true,
    info: 'patchProperty: unknown key set as attribute',
  },
  {
    fn: () => {
      const el = document.createElement('div')
      el.setAttribute('data-foo', 'bar')
      patchProperty(el, 'data-foo', 'bar', null, null, false)
      return el.hasAttribute('data-foo') === false
    },
    expect: true,
    info: 'patchProperty: null attribute removed',
  },
  {
    fn: () => {
      const el = document.createElement('div')
      el.setAttribute('data-foo', 'bar')
      patchProperty(el, 'data-foo', 'bar', false, null, false)
      return el.hasAttribute('data-foo') === false
    },
    expect: true,
    info: 'patchProperty: false attribute removed',
  },
  {
    fn: () => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      patchProperty(el, 'id', null, 'svgid', null, true)
      return el.getAttribute('id') === 'svgid'
    },
    expect: true,
    info: 'patchProperty: svg element uses attribute for id',
  },
  {
    fn: () => {
      const input = document.createElement('input')
      patchProperty(input, 'list', null, 'mylist', null, false)
      return input.getAttribute('list') === 'mylist'
    },
    expect: true,
    info: 'patchProperty: list key treated as attribute',
  },
  {
    fn: () => {
      const input = document.createElement('input')
      patchProperty(input, 'form', null, 'myform', null, false)
      return input.getAttribute('form') === 'myform'
    },
    expect: true,
    info: 'patchProperty: form key treated as attribute',
  },

  // ---- createNode -------------------------------------------------------
  {
    fn: () => {
      const v = h('div', { id: 'root' }, [h('span', {}, [text('hi')])])
      const node = createNode(v, () => {}, false)
      return node.tagName === 'DIV' && node.innerHTML === '<span>hi</span>'
    },
    expect: true,
    info: 'createNode: nested element with text',
  },
  {
    fn: () => {
      const v = text('plain')
      const node = createNode(v, () => {}, false)
      return node.nodeType === 3 && node.nodeValue === 'plain'
    },
    expect: true,
    info: 'createNode: text node',
  },
  {
    fn: () => {
      const v = h('svg', {}, [h('circle', { r: '5' }, [])])
      const node = createNode(v, () => {}, false)
      return node.namespaceURI === 'http://www.w3.org/2000/svg'
    },
    expect: true,
    info: 'createNode: svg element uses the SVG namespace',
  },
  {
    fn: () => {
      const v = h('div', {}, [true, false, null, text('x')])
      const node = createNode(v, () => {}, false)
      return node.childNodes.length === 4
    },
    expect: true,
    info: 'createNode: falsy children become empty text nodes',
  },
  {
    fn: () => {
      const v = h('div', {}, ['raw string', 42, h('span', {}, [])])
      return (
        v.children.length === 3 &&
        v.children[0].type === 3 &&
        v.children[0].tag === 'raw string' &&
        v.children[1].type === 3 &&
        String(v.children[1].tag) === '42' &&
        v.children[2].tag === 'span'
      )
    },
    expect: true,
    info: 'h: raw string and number children become text vnodes',
  },
  {
    fn: () => {
      const li = () => h('li', {}, [text('item')])
      const v = h('ul', {}, [li(), [li(), li()], [[li()]]])
      return v.children.length === 4 && v.children.every(child => child.tag === 'li')
    },
    expect: true,
    info: 'h: nested fragment arrays are flattened',
  },
  {
    fn: () => {
      const shared = [h('span', {}, [text('a')]), 'b']
      const v = h('div', {}, shared)
      return (
        v.children.length === 2 &&
        v.children[0] === shared[0] &&
        v.children[1].tag === 'b' &&
        v.children[1].type === 3
      )
    },
    expect: true,
    info: 'h: children are textified: vnodes kept by reference, strings become text vnodes',
  },
  {
    fn: () => {
      const v = h('div', { is: 'x-thing' }, [text('hi')])
      const node = createNode(v, () => {}, false)
      return node.tagName === 'DIV'
    },
    expect: true,
    info: 'createNode: custom element options (is) are passed through',
  },
  {
    fn: () => {
      const v = h('svg', { is: 'x-thing' }, [h('circle', {}, [])])
      const node = createNode(v, () => {}, false)
      return node.namespaceURI === 'http://www.w3.org/2000/svg'
    },
    expect: true,
    info: 'createNode: svg custom element options (is) are passed through',
  },

  // ---- patch (direct) ---------------------------------------------------
  {
    fn: () => {
      const parent = host()
      const newV = h('p', { id: 'x' }, [text('hi')])
      patch(parent, null, null, newV, () => {}, false)
      return parent.innerHTML === '<p id="x">hi</p>'
    },
    expect: true,
    info: 'patch: mounts a new element',
  },
  {
    fn: () => {
      const parent = host()
      const textNode = document.createTextNode('old')
      parent.appendChild(textNode)
      const oldV = { tag: 'old', props: {}, children: [], type: 3, node: textNode }
      const newV = { tag: 'new', props: {}, children: [], type: 3, node: textNode }
      patch(parent, textNode, oldV, newV, () => {}, false)
      return textNode.nodeValue === 'new'
    },
    expect: true,
    info: 'patch: text node value updated in place',
  },
  {
    fn: () => {
      const parent = host()
      const oldEl = document.createElement('span')
      parent.appendChild(oldEl)
      const oldV = { tag: 'span', props: {}, children: [], type: 1, node: oldEl }
      const newV = h('div', {}, [])
      patch(parent, oldEl, oldV, newV, () => {}, false)
      return parent.querySelector('span') === null && parent.querySelector('div') !== null
    },
    expect: true,
    info: 'patch: tag change replaces the element',
  },
  {
    fn: () => {
      const parent = host()
      const el = document.createElement('p')
      parent.appendChild(el)
      const oldV = { tag: 'p', props: {}, children: [], type: 1, node: el }
      const newV = { tag: 'p', props: {}, children: [], type: 1, node: el }
      patch(parent, el, oldV, newV, () => {}, false)
      return parent.childNodes.length === 1
    },
    expect: true,
    info: 'patch: identical element is a no-op',
  },
  {
    fn: () => {
      const parent = host()
      const el = document.createElement('p')
      parent.appendChild(el)
      const oldV = { tag: 'p', props: {}, children: [], type: 1, node: el }
      const newV = h('p', { id: 'added' }, [text('c')])
      patch(parent, el, oldV, newV, () => {}, false)
      return el.id === 'added' && el.innerHTML === 'c'
    },
    expect: true,
    info: 'patch: props and children added to existing element',
  },
  {
    fn: () => {
      const parent = host()
      const child = document.createElement('i')
      const el = document.createElement('p')
      el.appendChild(child)
      parent.appendChild(el)
      const oldV = {
        tag: 'p',
        props: {},
        children: [{ tag: 'i', props: {}, children: [], type: 1, node: child }],
        type: 1,
        node: el,
      }
      const newV = h('p', {}, [])
      patch(parent, el, oldV, newV, () => {}, false)
      return el.childNodes.length === 0
    },
    expect: true,
    info: 'patch: children removed when new list is empty',
  },
  {
    fn: () => {
      const parent = host()
      const a = document.createElement('i')
      const b = document.createElement('i')
      const el = document.createElement('p')
      el.appendChild(a)
      el.appendChild(b)
      parent.appendChild(el)
      const oldA = h('i', { key: 'a' }, [])
      oldA.node = a
      const oldB = h('i', { key: 'b' }, [])
      oldB.node = b
      const oldV = h('p', {}, [oldA, oldB])
      oldV.node = el
      const newV = h('p', {}, [h('i', { key: 'b' }, []), h('i', { key: 'a' }, [])])
      patch(parent, el, oldV, newV, () => {}, false)
      return el.childNodes.length === 2 && el.firstChild === b && el.lastChild === a
    },
    expect: true,
    info: 'patch: keyed children are reordered without recreation',
  },
  {
    fn: () => {
      const parent = host()
      const d = document.createElement('i')
      const b = document.createElement('i')
      const a = document.createElement('i')
      const el = document.createElement('p')
      el.appendChild(d)
      el.appendChild(b)
      el.appendChild(a)
      parent.appendChild(el)
      const oldD = h('i', {}, [])
      oldD.node = d
      const oldB = h('i', { key: 'b' }, [])
      oldB.node = b
      const oldA = h('i', { key: 'a' }, [])
      oldA.node = a
      const oldV = h('p', {}, [oldD, oldB, oldA])
      oldV.node = el
      const newV = h('p', {}, [h('i', { key: 'b' }, []), h('i', { key: 'c' }, [])])
      patch(parent, el, oldV, newV, () => {}, false)
      return el.childNodes.length === 2 && el.firstChild === b
    },
    expect: true,
    info: 'patch: unkeyed leading child dropped, new key inserted, unused key removed',
  },
  {
    fn: () => {
      const parent = host()
      const a = document.createElement('i')
      const d = document.createElement('i')
      const b = document.createElement('i')
      const el = document.createElement('p')
      el.appendChild(a)
      el.appendChild(d)
      el.appendChild(b)
      parent.appendChild(el)
      const oldA = h('i', { key: 'a' }, [])
      oldA.node = a
      const oldD = h('i', {}, [])
      oldD.node = d
      const oldB = h('i', { key: 'b' }, [])
      oldB.node = b
      const oldV = h('p', {}, [oldA, oldD, oldB])
      oldV.node = el
      const newV = h('p', {}, [h('i', { key: 'b' }, []), h('i', { key: 'a' }, [])])
      patch(parent, el, oldV, newV, () => {}, false)
      return el.childNodes.length === 2 && el.firstChild === b && el.lastChild === a
    },
    expect: true,
    info: 'patch: leftover unkeyed child is removed during cleanup',
  },

  {
    fn: () => {
      const parent = host()
      const el = document.createElement('p')
      parent.appendChild(el)
      const v = h('p', {}, [])
      v.node = el
      patch(parent, el, v, v, () => {}, false)
      return parent.childNodes.length === 1 && parent.firstChild === el
    },
    expect: true,
    info: 'patch: identical old and new vnode is a no-op',
  },
  {
    fn: () => {
      const parent = host()
      const a = document.createElement('i')
      const b = document.createElement('i')
      const el = document.createElement('p')
      el.appendChild(a)
      el.appendChild(b)
      parent.appendChild(el)
      const oldA = h('i', { key: 'a' }, [])
      oldA.node = a
      const oldB = h('i', { key: 'b' }, [])
      oldB.node = b
      const oldV = h('p', {}, [oldA, oldB])
      oldV.node = el
      const newV = h('p', {}, [h('i', { key: 'a' }, []), h('i', { key: 'c' }, [])])
      patch(parent, el, oldV, newV, () => {}, false)
      return el.childNodes.length === 2 && el.firstChild === a
    },
    expect: true,
    info: 'patch: matching head keys patch children in place',
  },
  {
    fn: () => {
      const parent = host()
      const a = document.createElement('i')
      const b = document.createElement('i')
      const el = document.createElement('p')
      el.appendChild(a)
      el.appendChild(b)
      parent.appendChild(el)
      const oldA = h('i', { key: 'a' }, [])
      oldA.node = a
      const oldB = h('i', { key: 'b' }, [])
      oldB.node = b
      const oldV = h('p', {}, [oldA, oldB])
      oldV.node = el
      const newV = h('p', {}, [h('i', { key: 'c' }, []), h('i', { key: 'b' }, [])])
      patch(parent, el, oldV, newV, () => {}, false)
      return el.childNodes.length === 2 && el.lastChild === b
    },
    expect: true,
    info: 'patch: matching tail keys patch children in place',
  },

  {
    fn: () => {
      const parent = host()
      const input = document.createElement('input')
      parent.appendChild(input)
      const oldV = h('input', {})
      oldV.node = input
      const newV = h('input', { value: 'hello' })
      patch(parent, input, oldV, newV, () => {}, false)
      return input.value === 'hello'
    },
    expect: true,
    info: 'patch: value prop is read from the live node before comparing',
  },
  {
    fn: () => {
      const parent = host()
      const a = document.createElement('i')
      const b = document.createElement('i')
      const el = document.createElement('p')
      el.appendChild(a)
      el.appendChild(b)
      parent.appendChild(el)
      const oldA = h('i', { key: 'a' }, [])
      oldA.node = a
      const oldB = h('i', {}, [])
      oldB.node = b
      // Array-like children list: .length is 1 but index 1 still resolves,
      // so new children insert before that trailing node instead of appending.
      const oldV = { tag: 'p', props: {}, children: { 0: oldA, 1: oldB, length: 1 }, node: el }
      const newV = h('p', {}, [h('i', { key: 'a' }, []), h('i', { key: 'x' }, [])])
      patch(parent, el, oldV, newV, () => {}, false)
      return el.childNodes.length === 3 && el.lastChild === b
    },
    expect: true,
    info: 'patch: new children insert before a trailing old child when the list is exhausted',
  },

  // ---- recycleNode ------------------------------------------------------
  {
    fn: () => {
      const t = recycleNode(document.createTextNode('hi'))
      return t.tag === 'hi' && t.type === 3
    },
    expect: true,
    info: 'recycleNode: text node',
  },
  {
    fn: () => {
      const div = document.createElement('div')
      div.appendChild(document.createTextNode('x'))
      const v = recycleNode(div)
      return v.tag === 'div' && v.type === 1 && v.children.length === 1
    },
    expect: true,
    info: 'recycleNode: element with a text child',
  },

  // ---- app --------------------------------------------------------------
  {
    fn: async () => {
      const node = host()
      const dispatch = app({
        node,
        view: state => h('div', { id: 'root' }, [text(String(state.count))]),
        init: { count: 0 },
      })
      await frame()
      dispatch(s => ({ count: s.count + 1 }))
      await frame()
      return node.id === 'root' && node.innerHTML === '1'
    },
    expect: true,
    info: 'app: initial render and action-driven update',
  },
  {
    fn: async () => {
      const node = host()
      const dispatch = app({
        node,
        view: state => h('div', { id: 'root' }, [text(String(state.count))]),
        init: { count: 0 },
      })
      await frame()
      dispatch([s => ({ count: s.count + 10 }), { n: 1 }])
      await frame()
      return node.textContent === '10'
    },
    expect: true,
    info: 'app: [action, payload] tuple dispatch',
  },
  {
    fn: async () => {
      const node = host()
      const effects: string[] = []
      const dispatch = app({
        node,
        view: state => h('div', { id: 'root' }, [text(String(state.count))]),
        init: { count: 0 },
      })
      await frame()
      dispatch([
        { count: 5 },
        (_d, _p) => {
          effects.push('e1')
        },
        (_d, _p) => {
          effects.push('e2')
        },
        null,
        true,
      ])
      await frame()
      return node.textContent === '5' && effects.join(',') === 'e1,e2'
    },
    expect: true,
    info: 'app: state array runs effects and skips falsy ones',
  },
  {
    fn: async () => {
      const node = host()
      let external = 0
      app({
        node,
        view: state => h('div', { id: 'root' }, [text(String(state.count))]),
        subscriptions: state => [
          [
            (_d, _p) => {
              external = 42
              return () => {}
            },
            state,
          ],
        ],
        init: { count: 0 },
      })
      await frame()
      return external === 42
    },
    expect: true,
    info: 'app: subscriptions are started on init',
  },
  {
    fn: async () => {
      const node = host()
      app({
        node,
        view: state => h('div', { id: 'root' }, [text(String(state.count))]),
        init: { count: 0 },
      })
      await frame()
      return node.id === 'root' && node.innerHTML === '0'
    },
    expect: true,
    info: 'app: renders into the mount node',
  },
  {
    fn: async () => {
      const node = host()
      app({
        node,
        view: () => h('div', { id: 'root' }, ['hello', ' world']),
      })
      await frame()
      return node.innerHTML === 'hello world'
    },
    expect: true,
    info: 'app: raw string children render as text',
  },
  {
    fn: async () => {
      const node = host()
      const dispatch = app({
        node,
        view: state => h('div', { id: 'root' }, [String(state.count)]),
        init: { count: 0 },
      })
      await frame()
      const firstTextNode = node.firstChild as Text
      dispatch({ count: 1 })
      await frame()
      return (
        node.innerHTML === '1' &&
        node.firstChild === firstTextNode &&
        firstTextNode.nodeValue === '1'
      )
    },
    expect: true,
    info: 'app: raw string child patches in place without re-creating the node',
  },
  {
    fn: async () => {
      const node = host('button')
      app({
        node,
        view: state =>
          h('button', { onclick: (s, _e) => ({ count: s.count + 1 }) }, [
            text(String(state.count)),
          ]),
        init: { count: 0 },
      })
      await frame()
      node.click()
      await frame()
      return node.textContent === '1'
    },
    expect: true,
    info: 'app: event handler action updates state',
  },
  {
    fn: async () => {
      const node = host()
      app({
        node,
        view: state => h('div', { id: 'root' }, [text(String(state.count))]),
        dispatch: d => d,
        init: { count: 7 },
      })
      await frame()
      return node.textContent === '7'
    },
    expect: true,
    info: 'app: custom dispatch wrapper is applied',
  },
  {
    fn: async () => {
      const node = host()
      const dispatch = app({
        node,
        view: state => h('div', { id: 'root' }, [text(String(state.count))]),
        init: { count: 0 },
      })
      await frame()
      let threw = false
      try {
        dispatch(null)
      } catch {
        threw = true
      }
      return threw
    },
    expect: true,
    info: 'app: null state teardown hits the unregistration path',
  },
] satisfies Test[]
