// 全局变异观察者
/* globals MutationObserver */
import { noop } from 'shared/util'
import { handleError } from './error'
import { isIE, isIOS, isNative } from './env'

export let isUsingMicroTask = false // 正在使用微任务

const callbacks: Array<Function> = []
let pending = false

function flushCallbacks() {
  pending = false
  // 数组的slice方法，为浅拷贝
  // let a = [{name:1},{name:2}];
  // let b = a.slice(0);
  // b[0].name = 123;
  // a[0]的name值则变为123
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

// Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
//在2.5中，我们使用了（宏）任务（与微任务相结合）。
//然而，当状态在重新绘制之前发生更改时，它会有一些微妙的问题
//（例如#6813、out in转换）。
//此外，在事件处理程序中使用（宏）任务会导致一些奇怪的行为
//无法规避的（例如#7109、#7153、357546、#7834、#8109）。
//因此，我们现在再次到处使用微任务。
//这种权衡的一个主要缺点是存在一些场景
//其中，微任务的优先级太高，可能会在两者之间触发
//顺序事件（例如#4521、#6690，它们具有解决方案）
//或者甚至在同一事件的起泡之间（#6566）。
let timerFunc

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
//nextTick行为利用可以访问的微任务队列
//通过本地或承诺。然后或突变观察者。
//MutationObserver有更广泛的支持，但它存在严重的漏洞
//当在触摸事件处理程序中触发时，iOS中的UIWebView>=9.3.3。它
//触发几次后完全停止工作…所以，如果是本地的
//Promise可用，我们将使用它：
/* istanbul ignore next, $flow-disable-line */
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    // In problematic UIWebViews, Promise.then doesn't completely break, but
    // it can get stuck in a weird state where callbacks are pushed into the
    // microtask queue but the queue isn't being flushed, until the browser
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // "force" the microtask queue to be flushed by adding an empty timer.
	//在有问题的UIWebView中，Promise。然后它不会完全断裂，但是
	//它可能会陷入一种奇怪的状态，回调被推入
	//微任务队列，但直到浏览器
	//需要做一些其他工作，例如处理计时器。因此，我们可以：
	//通过添加空计时器“强制”刷新微任务队列。
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
} else if (
  !isIE &&
  typeof MutationObserver !== 'undefined' &&
  (isNative(MutationObserver) ||
    // PhantomJS and iOS 7.x
    MutationObserver.toString() === '[object MutationObserverConstructor]')
) {
  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  // (#6466 MutationObserver is unreliable in IE11)
  //在本地Promise不可用的情况下使用MutationObserver，
  //例如PhantomJS、iOS7、Android 4.4
  //（#6466 MutationObserver在IE11中不可靠）
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // Fallback to setImmediate.
  // Technically it leverages the (macro) task queue,
  // but it is still a better choice than setTimeout.
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // Fallback to setTimeout.
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

export function nextTick(): Promise<void>
export function nextTick<T>(this: T, cb: (this: T, ...args: any[]) => any): void
export function nextTick<T>(cb: (this: T, ...args: any[]) => any, ctx: T): void
/**
 * @internal
 */
export function nextTick(cb?: (...args: any[]) => any, ctx?: object) {
  let _resolve
  callbacks.push(() => {
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e: any) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  if (!pending) {
    pending = true
    timerFunc()
  }
  // $flow-disable-line
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}

// https://blog.csdn.net/qq_35385241/article/details/121989261
// 针对MutationObserver的使用示例
// //选择一个需要观察的节点
// var targetNode = document.getElementsByClassName('test')[0];

// // 设置observer的配置选项
// var config = { attributes: true, childList: true, subtree: true };

// // 当节点发生变化时的需要执行的函数
// var callback = function(mutationsList, observer) {
//     for(var mutation of mutationsList) {
//         if (mutation.type == 'childList') {
//             console.log('A child node has been added or removed.');
//         }
//         else if (mutation.type == 'attributes') {
//             console.log('The ' + mutation.attributeName + ' attribute was modified.');
//         }
//     }
// };

// // 创建一个observer示例与回调函数相关联
// var observer = new MutationObserver(callback);

// //使用配置文件对目标节点进行观测
// observer.observe(targetNode, config);

// // 停止观测
// observer.disconnect();