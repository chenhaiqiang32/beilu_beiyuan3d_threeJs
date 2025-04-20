import * as THREE from "three";

import { shaderModify } from "./funs";

import {


  fadeTime,
  lightIndex,
  lightBox,
  lightingPattern,

} from "./parameters";


//todo
/**
 * 新增着色器方法
 * 1 在chunk文件夹中创建新的chunk 创建格式参照fresnel 格式
 * 2 在chunk的index文件中导出chunk
 * 3 在该文件中新增调用函数，需要将着色器中的参数以param形式传入
 * 4 elapsedTime 时间参数无需手动传入
 *
 * 如果着色器用于修改风格特效 需要用到lightingPattern参数，需要在
 * 片元着色器的uniform部分添加　#define USE_WEATHER
 * 并且在param参数中手动传入uStyle
 */


/**
 * 菲尼尔反射
 * @param {THREE.Material} material
 * @param {Number} strength 反射系数
 * @param {THREE.Color} color 颜色
 */

function fresnel(material,strength = 1.5,color = new THREE.Color(0xffff00)) {
  const param = {
    strength: strength,
    uColor: color
  };

  material.onBeforeCompile = shader => {

    shaderModify(shader,'fresnel',param);

  };

}
function gatherFenceShader(material,uTime = { value: 0 },color = new THREE.Color(0xffff00),num) {
  const param = {
    uTime,
    uColor: color,
    num
  };

  material.onBeforeCompile = shader => {

    shaderModify(shader,'gatherFenceEffect',param);

  };

}


/**
 * 基于uv距离的地形边缘虚化
 * @param {THREE.Material} material
 * @param {Number} width 最小值为0最大值为1
 */

function edgeFadeUV(material,width = 0.12) {
  const param = {
    width: width
  };

  material.onBeforeCompile = shader => {

    shaderModify(shader,'edgeFadeUV',param);

  };
}


/**
 * 基于坐标距离的地形边缘虚化
 * @param {THREE.Material} material
 * @param {Number} fade 虚化的宽度
 * @param {Number} land 实心地面宽度
 */

function edgeFadeDis(material,fade = 1800,land = 3000) {

  const param = {
    fade: fade,
    land: land
  };
  material.onBeforeCompile = shader => {

    shaderModify(shader,'edgeFadeDis',param);

  };
}


/**
 * 增加亮度
 * @param {THREE.Material} material
 * @param {Number} strength 亮度系数
 */
function brighten(material,strength = 10) {
  const param = {
    strength: strength,
  };
  material.onBeforeCompile = shader => {

    shaderModify(shader,'brighten',param);

  };
}

/**
 * 使模型夜晚发光
 * @param {THREE.Material} material
 * @param {Number} strength 亮度系数
 */

function brightenNight(material,strength = 10) {
  const param = {
    strength: strength,
    uStyle: lightingPattern
  };
  material.onBeforeCompile = shader => {

    shaderModify(shader,'brightenNight',param);

  };
}



/**
 * 模型随时间透明
 * @param {THREE.Material} material
 * @param {{value:Number}} uTime 时间参数 数值为0-1
 */

function fadeByTime(material,uTime) {
  const param = {
    uTime: uTime
  };

  material.onBeforeCompile = shader => {

    shaderModify(shader,'fadeByTime',param);

  };
}

/**
 * 模型动态透明 用于室内定位建筑
 * @param {THREE.Material} material
 * @param {{value:Number}} uTime 时间参数 数值为0-1
 * @param {{value:Number}} color 特效颜色
 */
function dynamicFade(material,uTime,color = new THREE.Color("#3acacc")) {

  const param = {
    uTime: uTime,
    uBox: lightBox,
    lightIndex: lightIndex,
    uColor: color
  };

  material.onBeforeCompile = shader => {

    shaderModify(shader,'dynamicFade',param);

  };
}

/**
 * 天气系统中玻璃材质处理
 * @param {THREE.Material} material
 */
function glassEffect(material) {


  const param = {
    uStyle: lightingPattern
  };

  material.onBeforeCompile = shader => {

    shaderModify(shader,'glassEffect',param);

  };
}

/**
 * 树木处理
 * @param {THREE.Material} material
 */
function treeModify(material,color = new THREE.Color("#59FFD3")) {

  const param = {
    uStyle: lightingPattern,
    uColor: color
  };

  material.onBeforeCompile = shader => {

    shaderModify(shader,'treeModify',param);

  };
}

/**
 * 马路上流光路径 运用于北元项目
 * @param {THREE.Material} material
 * @param {Float} speed
 */
function pathFlow(material,speed = 0.9) {

  const param = {
    uStyle: lightingPattern,
    uSpeed: speed
  };

  material.onBeforeCompile = shader => {

    shaderModify(shader,'pathFlow',param);

  };
}

/**
 * 科技风效果专用 切换成科技风时修改颜色,颜色不受灯光影响
 * @param {THREE.Material} material
 * @param {{value:THREE.Color}} color 特效颜色
 */
function sci_colorModify(material,color = new THREE.Color("#59FFD3")) {
  const param = {
    uStyle: lightingPattern,
    uColor: color
  };

  material.onBeforeCompile = shader => {

    shaderModify(shader,'sci_colorModify',param);

  };
}

/**
 * 科技风效果专用 切换成科技风时增加亮度
 * @param {THREE.Material} material
 * @param {{value:Number}} strength 强度
 */
function sci_brighten(material,strength = 10) {
  const param = {
    uStyle: lightingPattern,
    strength: strength
  };

  material.onBeforeCompile = shader => {

    shaderModify(shader,'sci_brighten',param);

  };
}
/**
 * 科技风效果专用 外地形
 * @param {THREE.Material} material
 * @param {{value:Number}} strength 强度
 */
function sci_outerLand(material,color = new THREE.Color("#59FFD3"),fade = 1600,land = 2800) {
  const param = {
    uStyle: lightingPattern,
    fade: fade,
    land: land,
    uColor: color
  };

  material.onBeforeCompile = shader => {

    shaderModify(shader,'sci_outerLand',param);
  };

}
/**
 * 科技风效果专用 球场专用
 * @param {THREE.Material} material
 */
function sci_playground(material,strength = 5.5) {
  const param = {
    uStyle: lightingPattern,
    strength: strength
  };

  material.onBeforeCompile = shader => {

    shaderModify(shader,'sci_playground',param);
  };

}
export {
  gatherFenceShader,
  fresnel,
  edgeFadeDis,
  edgeFadeUV,
  brighten,
  brightenNight,
  fadeByTime,
  dynamicFade,
  glassEffect,
  treeModify,
  pathFlow,
  sci_colorModify,
  sci_brighten,
  sci_outerLand,
  sci_playground
};
