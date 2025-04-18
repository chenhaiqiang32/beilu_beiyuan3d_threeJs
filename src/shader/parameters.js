import { Vector2 } from "three";

/** @description 灯光风格控制器 4白天，8夜晚 16科技风 */
export const DAY = 4;
export const NIGHT = 8;
export const SCIENCE = 16;
export const lightingPattern = {
  value: DAY,
};
export const elapsedTime = {
  value: 0,
};
export const flowTime = {
  value: 1,
};
export const skinTime = {};
// 窗户玻璃动画时间
export const glassTime = {
  value: 0,
};
// 动态消失时间
export const fadeTime = {
  value: 1.0,
};
// 光线索引
export const lightIndex = {
  value: -100,
};
// 建筑扫光top和bot
export const lightBox = {
  value: new Vector2(100,-100),
};
/**
 * @description 着色器定位锚点
 * @SHADER_END  着色器最终输出值处
 * @DIFFUSE_END 着色器漫反射结束点
 * @SHADER_UNIFORM 着色器uniform添加处
 */
export const SHADER_END = "//#shader_end#";
export const SHADER_UNIFORM = "//#shader_uniform#";
export const DIFFUSE_END = "//#diffuse_end#";

