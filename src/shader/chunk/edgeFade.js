import { ShaderChunk } from "three";
import { SHADER_UNIFORM,SHADER_END } from "../parameters";


/**
 * 基于uv的地形边缘虚化
 * @param width 宽度百分比
 */

ShaderChunk.effect_uniform_edgeFadeUV = /* glsl */ `

uniform float width;
`;

ShaderChunk.effect_fragment_edgeFadeUV = /* glsl */ `

vec2 v = st.xy - 0.5;
float s = width; // 虚化宽度
float t = 0.5 - width; // 非虚化区域 // s+t相加最好不大于模型2分之一的长度
float x = abs(v.x);
float y = abs(v.y);
if(x > t) gl_FragColor.a *= pow((0.5-x) / s,2.0) ;
if(y > t) gl_FragColor.a *= pow((0.5-y) / s,2.0) ;

`;


// 导出结果
export const edgeFadeUV = {
  uniform: { // uniform部分
    shader: "effect_uniform_edgeFadeUV",
    location: SHADER_UNIFORM // 插入代码块的锚点 此处表示在uniform内插入，默认在#<common>后面插入
  },
  chunk: { // main函数部分
    shader: "effect_fragment_edgeFadeUV",
    location: SHADER_END // 插入代码块的锚点 此处表示在着色器尾处插入
  },
};


/**
 * 基于坐标距离的地形边缘虚化
 * @param width 宽度数值
 */

ShaderChunk.effect_uniform_edgeFadeDis = /* glsl */ `

uniform float fade;
uniform float land;
`;

ShaderChunk.effect_fragment_edgeFadeDis = /* glsl */ `

float d = fade; // 虚化宽度
float t = land; // 非虚化区域
float x = abs(mPosition.x);
float z = abs(mPosition.z);
if(x > t) gl_FragColor.a *= (d - x + t) / d;
if(z > t) gl_FragColor.a *= (d - z + t) / d;

`;


// 导出结果
export const edgeFadeDis = {
  uniform: { // uniform部分
    shader: "effect_uniform_edgeFadeDis",
    location: SHADER_UNIFORM // 插入代码块的锚点 此处表示在uniform内插入，默认在#<common>后面插入
  },
  chunk: { // main函数部分
    shader: "effect_fragment_edgeFadeDis",
    location: SHADER_END // 插入代码块的锚点 此处表示在着色器尾处插入
  },
};
