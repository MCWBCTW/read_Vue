// can we use __proto__?
export const hasProto = '__proto__' in {}

// Browser environment sniffing
// 浏览器环境嗅探
export const inBrowser = typeof window !== 'undefined'
// window.navigator		html中内置对象，包含浏览器信息
// userAgent为window.navigator的属性方法，返回发送给服务器的头部的值
// 整体作用为判断当前用户使用什么浏览器
// toLowerCase()		转换为小写字母
export const UA = inBrowser && window.navigator.userAgent.toLowerCase()
export const isIE = UA && /msie|trident/.test(UA)
export const isIE9 = UA && UA.indexOf('msie 9.0') > 0
export const isEdge = UA && UA.indexOf('edge/') > 0
export const isAndroid = UA && UA.indexOf('android') > 0
export const isIOS = UA && /iphone|ipad|ipod|ios/.test(UA)
export const isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge
export const isPhantomJS = UA && /phantomjs/.test(UA)
export const isFF = UA && UA.match(/firefox\/(\d+)/)

// Firefox has a "watch" function on Object.prototype...
// Firefox在原型上有watch功能
// @ts-expect-error firebox support
// ts预期错误，firebox支持
export const nativeWatch = {}.watch

export let supportsPassive = false // 支持被动	在浏览器中运行时，下列代码将会把值改为true
if (inBrowser) {
  try {
    const opts = {}
    Object.defineProperty(opts, 'passive', {
      get() {
        /* istanbul ignore next */
        supportsPassive = true
      }
    } as object) // https://github.com/facebook/flow/issues/285
	// 解析opts中的passive属性，触发get方法，将supportsPassive改为true
    window.addEventListener('test-passive', null as any, opts)
  } catch (e: any) {}
}

// this needs to be lazy-evaled because vue may be required before
// 这需要延迟评估，因为以前可能需要vue
// vue-server-renderer can set VUE_ENV
// 视图服务器渲染器可以设置视图环境
let _isServer
export const isServerRendering = () => {
  if (_isServer === undefined) {
    /* istanbul ignore if */
    if (!inBrowser && typeof global !== 'undefined') {
      // detect presence of vue-server-renderer and avoid
	  // 检测vue服务器渲染器的存在并避免
      // Webpack shimming the process
      _isServer =
        global['process'] && global['process'].env.VUE_ENV === 'server'
    } else {
      _isServer = false
    }
  }
  return _isServer
}

// detect devtools
// 检测开发工具
export const devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__

/* istanbul ignore next */
export function isNative(Ctor: any): boolean {
  return typeof Ctor === 'function' && /native code/.test(Ctor.toString())
}

export const hasSymbol =
  typeof Symbol !== 'undefined' &&
  isNative(Symbol) &&
  typeof Reflect !== 'undefined' &&
  isNative(Reflect.ownKeys)


// 定义一个Set数据类型，存在则直接使用，不存在时实现一个Set数据类型

let _Set // $flow-disable-line
/* istanbul ignore if */ if (typeof Set !== 'undefined' && isNative(Set)) {
  // use native Set when available.
  _Set = Set
} else {
  // a non-standard Set polyfill that only works with primitive keys.
  // 非标准集多边形填充，仅适用于基本体关键点
  // 定义一个Set类受接口SimpleSet的规范
  _Set = class Set implements SimpleSet {
    set: Record<string, boolean> = Object.create(null)

    has(key: string | number) {
      return this.set[key] === true
    }
    add(key: string | number) {
      this.set[key] = true
    }
    clear() {
      this.set = Object.create(null)
    }
  }
}

// 定义一个接口，规范_Set
export interface SimpleSet {
  has(key: string | number): boolean
  add(key: string | number): any
  clear(): void
}

export { _Set }
