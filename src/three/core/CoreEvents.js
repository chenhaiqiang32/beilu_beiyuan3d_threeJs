import { CoreBase } from "./CoreBase";

import * as TWEEN from "three/examples/jsm/libs/tween.module";

/** 基于开放封闭设计原则设计的事件层，实例可选择直接继承Base获取基础功能，可选择继承EventBase获取事件层功能*/
export class CoreEvents extends CoreBase {
  /**@type {Map<string | Symbol, Function[]>} */
  #eventMap;

  /**@param { HTMLElement | HTMLCanvasElement | undefined } domElement  */
  constructor(domElement) {
    super(domElement);
    this.#eventMap = new Map();
  }

  /**@param {keyof HTMLElementEventMap} type  */
  addEventListener(type) {
    const eventQueue = this.#eventMap.get(type) || [];

    /**事件队列执行函数 */
    const execute = event => {
      if (TWEEN.getAll().length > 0) {
        return;
      }
      eventQueue.forEach(fn => fn(event,this));
    };

    /**移除事件监听 */
    const clear = () => {
      window.removeEventListener(type,execute);
      eventQueue.length = 0;
      this.#eventMap.delete(type);
    };

    /**
     * 向事件队列中添加执行函数
     * @param { ( event, param: this ) => void} fn
     */
    const add = fn => {
      if (eventQueue.indexOf(fn) !== -1) {
        return () => {
          const index = eventQueue.indexOf(fn);
          eventQueue.splice(index,1);
        };
      }
      eventQueue.push(fn);

      const del = () => {
        const index = eventQueue.indexOf(fn);
        eventQueue.splice(index,1);
        if (eventQueue.length === 0) {
          clear();
        }
      };
      return del;
    };

    if (!this.#eventMap.has(type)) {
      this.#eventMap.set(type,eventQueue);
      window.addEventListener(type,execute);
    }

    return { add,clear };
  }
}
