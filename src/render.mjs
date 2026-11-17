import { Readable } from 'stream'

const { isArray } = Array
const { hasOwnProperty } = Object.prototype
const styleNameCache = /** @type {Map<string, string>} */ (new Map())
const uppercasePattern = /[A-Z]/g
const msPattern = /^ms-/

// https://www.w3.org/International/questions/qa-escapes#use
const escapeRegExp = /["&'<>]/

// https://www.w3.org/TR/html/syntax.html#void-elements
const voidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

/**
 * A list of class values.
 * @typedef {ClassNames[]} ClassList
 */

/**
 * A class value: a class name, a list of class values, or a mapping of class
 * names to flags.
 * @typedef {string | number | ClassList | Record<string, string | number | boolean>} ClassNames
 */

/**
 * An inline-CSS mapping that this renderer accepts.
 * @typedef {Record<string, string | number | null>} StyleValue
 */

/**
 * The data of a deferred (lazy) view: a `view` function plus its payload.
 * @template S
 * @typedef {{ view: (data: unknown) => Renderable<S> } & Record<string, unknown>} LazyData
 */

/**
 * A VNode object the renderer can turn into markup.
 *
 * This shape accepts the VNodes built by `h()` and `text()` (see
 * `hyperapp.d.mts`), memoized views (`memo()`), along with the legacy
 * `name`/`nodeName`/`attributes` and lazy (`type: 2`) node shapes.
 * @template S
 * @typedef {object} RenderNode
 * @property {string | number | ((data: import('./hyperapp.d.mts').Indexable) => Renderable<S>)} [tag] Element name, text content, or the view of a memoized node.
 * @property {import('./hyperapp.d.mts').Props<S> | Record<string, unknown>} [props] Element properties.
 * @property {RenderList<S>} [children] Child nodes.
 * @property {string | number} [type] The node type (1 element, 3 text) or, for foreign nodes, a tag name.
 * @property {string | number} [name] Legacy tag name or text content.
 * @property {string} [nodeName] DOM-style tag name.
 * @property {Record<string, unknown>} [attributes] Alternative property bag.
 * @property {string | null | undefined} [key]
 * @property {import('./hyperapp.d.mts').Indexable} [memo] The data of a memoized view.
 * @property {LazyData<S>} [lazy]
 */

/**
 * A list of renderable values.
 * @template S
 * @typedef {ReadonlyArray<Renderable<S>>} RenderList
 */

/**
 * Any value the renderer can turn into markup.
 * @template S
 * @typedef {
 *   | ((state: S, actions: import('./hyperapp.d.mts').Dispatch<S>) => Renderable<S>)
 *   | RenderNode<S>
 *   | RenderList<S>
 *   | string
 *   | number
 *   | boolean
 *   | null
 *   | undefined
 * } Renderable
 */

/**
 * A frame of the rendering stack.
 * @template S
 * @typedef {object} StackFrame
 * @property {number} childIndex
 * @property {RenderList<S>} children
 * @property {string} footer
 */

// credits to https://github.com/component/escape-html
/**
 * Escape HTML special characters in a string.
 * @param {unknown} value - The value to escape
 * @returns {string}
 */
export const escapeHtml = value => {
  const str = '' + value
  if (typeof value === 'number') {
    // better performance for safe values
    return str
  }

  const match = escapeRegExp.exec(str)
  if (!match) {
    return str
  }

  let { index } = match
  let lastIndex = 0
  let out = ''

  for (let escape = ''; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = '&quot;'
        break
      case 38: // &
        escape = '&amp;'
        break
      case 39: // '
        escape = '&#39;' // shorter than "&apos;" and "&#x27;" plus supports HTML4
        break
      case 60: // <
        escape = '&lt;'
        break
      case 62: // >
        escape = '&gt;'
        break
      default:
        continue
    }

    if (lastIndex !== index) {
      out += str.substring(lastIndex, index)
    }

    lastIndex = index + 1
    out += escape
  }

  return lastIndex !== index ? out + str.substring(lastIndex, index) : out
}

// credits to https://github.com/jorgebucaran/classcat
/**
 * Concatenate class names from a string, number, array, or object.
 * @param {ClassNames} value - The value to concatenate
 * @returns {string | number}
 */
export const concatClassNames = value => {
  if (typeof value === 'string' || typeof value === 'number') {
    return value || ''
  }

  let out = ''
  let delimiter = ''

  if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const name = concatClassNames(value[i])
      if (name !== '') {
        out += delimiter + name
        delimiter = ' '
      }
    }
  } else {
    for (const name in value) {
      if (hasOwnProperty.call(value, name) && value[name]) {
        out += delimiter + name
        delimiter = ' '
      }
    }
  }

  return out
}

// "backgroundColor" => "background-color"
// "MozTransition" => "-moz-transition"
// "msTransition" => "-ms-transition"
/**
 * Hyphenate a style name (e.g. 'backgroundColor' => 'background-color').
 * @param {string} styleName - The style name to hyphenate
 * @returns {string}
 */
export const hyphenateStyleName = styleName => {
  if (!styleNameCache.has(styleName)) {
    const name = styleName.replace(uppercasePattern, '-$&').toLowerCase().replace(msPattern, '-ms-')

    // returns 'undefined' instead of the 'Map' object in IE11
    styleNameCache.set(styleName, name)
  }

  return styleNameCache.get(styleName) ?? ''
}

/**
 * Convert a CSS object to a string.
 * @param {StyleValue} style - The CSS properties object
 * @returns {string}
 */
export const stringifyStyles = style => {
  let out = ''
  let delimiter = ''

  for (const name in style) {
    if (hasOwnProperty.call(style, name)) {
      const value = style[name]

      if (value != null) {
        if (name === 'cssText') {
          out += delimiter + value
        } else {
          out += delimiter + hyphenateStyleName(name) + ':' + value
        }
        delimiter = ';'
      }
    }
  }

  return out
}

// https://www.w3.org/TR/html51/syntax.html#serializing-html-fragments
/**
 * Render a virtual DOM node to an HTML string.
 * @template S
 * @param {string | undefined} name - The tag name
 * @param {import('./hyperapp.d.mts').Props<S> | Record<string, unknown>} props - The element properties
 * @param {RenderList<S> | null | undefined} children - The child nodes
 * @param {StackFrame<S>[]} stack - The rendering stack
 * @returns {string}
 */
const renderFragment = (name, props, children, stack) => {
  let out = ''
  let footer = ''

  if (name) {
    out += '<' + name

    for (let prop in props) {
      if (hasOwnProperty.call(props, prop)) {
        let value = props[prop]

        if (
          value != null &&
          prop !== 'key' &&
          prop !== 'innerHTML' &&
          prop !== '__source' && // babel-plugin-transform-react-jsx-source
          !(prop[0] === 'o' && prop[1] === 'n')
        ) {
          if (prop === 'class' || prop === 'className') {
            prop = 'class'
            value = concatClassNames(/** @type {ClassNames} */ (value)) || false
          } else if (prop === 'style' && typeof value === 'object') {
            value = stringifyStyles(/** @type {StyleValue} */ (value)) || false
          }

          if (value !== false) {
            out += ' ' + prop

            if (value !== true) {
              out += '="' + escapeHtml(value) + '"'
            }
          }
        }
      }
    }

    if (voidElements.has(name)) {
      out += '/>'
    } else {
      out += '>'
      footer = '</' + name + '>'
    }
  }

  if (children && children.length > 0) {
    stack.push({
      childIndex: 0,
      children,
      footer,
    })
  } else {
    const { innerHTML } = props

    if (innerHTML != null) {
      out += String(innerHTML)
    }

    out += footer
  }

  return out
}

/**
 * Resolve a renderable value into a VNode, following view functions,
 * memoized views, and lazy views.
 * @template S
 * @param {Renderable<S>} node - The value to resolve
 * @param {S} state - The current state
 * @param {import('./hyperapp.d.mts').Dispatch<S>} actions - The dispatch actions
 * @returns {Renderable<S>}
 */
const resolveNode = (node, state, actions) => {
  if (typeof node === 'function') {
    return resolveNode(node(state, actions), state, actions)
  }

  if (node && typeof node === 'object' && !isArray(node)) {
    if (typeof node.tag === 'function') {
      return resolveNode(
        node.tag(/** @type {import('./hyperapp.d.mts').Indexable} */ (node.memo)),
        state,
        actions,
      )
    }

    if (node.type === 2 && node.lazy) {
      return resolveNode(node.lazy.view(node.lazy), state, actions)
    }
  }

  return node
}

/**
 * Render a view function to a string or stream.
 * @template S
 * @param {(state: S, actions: import('./hyperapp.d.mts').Dispatch<S>) => Renderable<S>} view - The view function
 * @param {S} state - The application state
 * @param {import('./hyperapp.d.mts').Dispatch<S>} actions - The dispatch actions
 * @returns {(bytes: number) => string | null} A function that renders up to a number of bytes.
 */
export const renderer = (view, state, actions) => {
  const stack = /** @type {StackFrame<S>[]} */ ([
    {
      childIndex: 0,
      children: [view],
      footer: '',
    },
  ])

  let end = false

  return (/** @param {number} bytes */ bytes) => {
    if (end) {
      return null
    }

    let out = ''

    while (out.length < bytes) {
      if (stack.length === 0) {
        end = true
        break
      }

      const frame = stack[stack.length - 1]

      if (frame.childIndex >= frame.children.length) {
        out += frame.footer
        stack.pop()
      } else {
        const node = resolveNode(frame.children[frame.childIndex++], state, actions)

        if (node != null && typeof node !== 'boolean') {
          if (isArray(node)) {
            stack.push({
              childIndex: 0,
              children: node,
              footer: '',
            })
          } else if (typeof node === 'string' || typeof node === 'number') {
            out += escapeHtml(node)
          } else if (typeof node === 'object') {
            if (node.tag === 3) {
              out += escapeHtml(node.type)
            } else if (node.type === 3) {
              out += escapeHtml(
                typeof node.tag === 'string' || typeof node.tag === 'number' ? node.tag : node.name,
              )
            } else {
              out += renderFragment(
                typeof node.tag === 'string'
                  ? node.tag
                  : typeof node.type === 'string'
                    ? node.type
                    : node.nodeName,
                node.props || node.attributes || {},
                node.children,
                stack,
              )
            }
          } else {
            out += escapeHtml(node)
          }
        }
      }
    }

    return out
  }
}

/**
 * Render a view to a string.
 * @template S
 * @param {(state: S, actions: import('./hyperapp.d.mts').Dispatch<S>) => Renderable<S>} view - The view function
 * @param {S} state - The application state
 * @param {import('./hyperapp.d.mts').Dispatch<S>} actions - The dispatch actions
 * @returns {string}
 */
export const renderToString = (view, state, actions) =>
  renderer(view, state, actions)(Infinity) ?? ''

/**
 * Render a view to a Readable stream.
 * @template S
 * @param {(state: S, actions: import('./hyperapp.d.mts').Dispatch<S>) => Renderable<S>} view - The view function
 * @param {S} state - The application state
 * @param {import('./hyperapp.d.mts').Dispatch<S>} actions - The dispatch actions
 * @returns {Readable} A Readable stream
 */
export const renderToStream = (view, state, actions) => {
  const read = renderer(view, state, actions)

  // https://nodejs.org/api/stream.html
  return new Readable({
    read(size) {
      try {
        this.push(read(size))
      } catch (err) {
        this.emit('error', err)
      }
    },
  })
}
