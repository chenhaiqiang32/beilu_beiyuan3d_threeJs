import { ShaderChunk } from "three";
import { SHADER_UNIFORM,SHADER_END } from "../parameters";




/**
 * 建筑随时间透明
 * @param uTime 时间参数
 */

ShaderChunk.effect_uniform_fadeByTime = /* glsl */ `
uniform float uTime;
`;

ShaderChunk.effect_fragment_fadeByTime = /* glsl */ `
gl_FragColor.a = gl_FragColor.a * uTime;
`;

export const fadeByTime = {
  uniform: { // uniform部分
    shader: "effect_uniform_fadeByTime",
    location: SHADER_UNIFORM // 插入代码块的锚点 此处表示在uniform内插入，默认在#<common>后面插入
  },
  chunk: { // main函数部分
    shader: "effect_fragment_fadeByTime",
    location: SHADER_END // 插入代码块的锚点 此处表示在着色器尾处插入
  },
};


/**
 * 建筑动态渐变透明，由下往上或者由上往下，带有特效
 *
 */

ShaderChunk.effect_uniform_dynamicFade = /* glsl */ `

uniform float uTime;
uniform float lightIndex;
uniform vec2 uBox;
uniform vec3 uColor;
`;

ShaderChunk.effect_fragment_dynamicFade = /* glsl */ `
gl_FragColor.a = gl_FragColor.a * uTime;
 float uWidth = 0.25;

 if(uTime == 1.0){ // uTime不变时该楼层被选中
   float toTopIndex = -(mPosition.y - lightIndex) * (mPosition.y - lightIndex) + uWidth;
   if(toTopIndex > 0.0) {
    // 光线
       gl_FragColor = mix(gl_FragColor, vec4(uColor,0.85), toTopIndex / uWidth);
   }
    // 光线上下部分的透明度
    float al = step(lightIndex,mPosition.y) + 0.3;
    gl_FragColor.a = al;
    // 排除不被选中的楼层 大于uBox.x或者小于uBox.y

     gl_FragColor.a += step(mPosition.y, uBox.y);

 }
`;

export const dynamicFade = {
  uniform: { // uniform部分
    shader: "effect_uniform_dynamicFade",
    location: SHADER_UNIFORM // 插入代码块的锚点 此处表示在uniform内插入，默认在#<common>后面插入
  },
  chunk: { // main函数部分
    shader: "effect_fragment_dynamicFade",
    location: SHADER_END // 插入代码块的锚点 此处表示在着色器尾处插入
  },
};


