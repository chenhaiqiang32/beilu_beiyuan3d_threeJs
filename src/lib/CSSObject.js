import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";
import { CSS3DSprite,CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer";

/**
 * @param {{
 * innerText:string|number,
 * className:string,
 * id:string,
 * children:HTMLElement[]
 * }} parameters
 * @param { string } type 事件类型
 * @param { EventListenerOrEventListenerObject } fn 事件回调
 * @returns { HTMLElement }
 */
export function createDom(parameters = {},type,fn) {
  const { innerText,className,id,children = [] } = parameters;
  const element = document.createElement("div");
  innerText && (element.innerText = innerText);
  className && (element.className = className);
  id && (element.id = id);
  element.title = innerText || "";

  children.forEach(child => {
    element.appendChild(child);
  });

  element.oncontextmenu = () => false;
  type && fn && element.addEventListener(type,fn);
  return element;
}

/**
 * @param {{
 * src:string
 * className:string,
 * id:string,
 * }} parameters
 * @returns { HTMLImageElement }
 */
export function createImage(parameters) {
  const { src,id,className } = parameters;
  const image = document.createElement("img");
  image.src = src;
  image.className = className;
  image.id = id;
  image.draggable = false;
  image.oncontextmenu = () => false;
  return image;
}

/**
 * @param { HTMLElement } element
 * @param { string } name
 * @returns { CSS2DObject }
 */
export function createCSS2DObject(element,name) {
  const _ = new CSS2DObject(element);
  _.name = name;
  return _;
}

export function createCSS3DObject(element,name) {
  const _ = new CSS3DObject(element);
  _.name = name;
  return _;
}

export function createCSS3DSprite(element,name) {
  const _ = new CSS3DSprite(element);
  _.name = name;
  return _;
}
