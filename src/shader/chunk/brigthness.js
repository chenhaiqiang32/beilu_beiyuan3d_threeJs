import { ShaderChunk } from "three";
import { SHADER_UNIFORM,SHADER_END } from "../parameters";


/**
 * 增加亮度
 * @param strength 亮度系数
 */


ShaderChunk.effect_uniform_brighten = /* glsl */ `
uniform float strength;
`;

ShaderChunk.effect_fragment_brighten = /* glsl */ `

gl_FragColor = vec4(gl_FragColor.xyz*strength, gl_FragColor.a);

`;


// 导出结果
export const brighten = {
  uniform: { // uniform部分
    shader: "effect_uniform_brighten",
    location: SHADER_UNIFORM // 插入代码块的锚点 此处表示在uniform内插入，默认在#<common>后面插入
  },
  chunk: { // main函数部分
    shader: "effect_fragment_brighten",
    location: SHADER_END // 插入代码块的锚点 此处表示在着色器尾处插入
  },
};

/**
 * 夜晚增加亮度
 * @param strength 亮度系数
 */


ShaderChunk.effect_uniform_brightenNight = /* glsl */ `
#define USE_WEATHER
uniform float strength;
`;

ShaderChunk.effect_fragment_brightenNight = /* glsl */ `

if(uStyle == NIGHT){
  gl_FragColor = vec4(gl_FragColor.xyz*strength, gl_FragColor.a);
}

`;


// 导出结果
export const brightenNight = {
  uniform: { // uniform部分
    shader: "effect_uniform_brightenNight",
    location: SHADER_UNIFORM // 插入代码块的锚点 此处表示在uniform内插入，默认在#<common>后面插入
  },
  chunk: { // main函数部分
    shader: "effect_fragment_brightenNight",
    location: SHADER_END // 插入代码块的锚点 此处表示在着色器尾处插入
  },
};
