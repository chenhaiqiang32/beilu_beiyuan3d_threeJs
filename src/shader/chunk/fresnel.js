import { ShaderChunk } from "three";
import { SHADER_UNIFORM,SHADER_END } from "../parameters";


/**
 * 菲涅尔反射
 * @param strength 效果系数
 */


// 需要增加uniform参数时需要自己定义，然后在使用shaderModify函数时在第三个参数内传入同名的参数
// 比如定义了strength，需要在参数内加入{strength:1.5}或者 {strength:{value:1.5}}

ShaderChunk.effect_uniform_fresnel = /* glsl */ `

uniform float strength;
uniform vec3 uColor;
`;

ShaderChunk.effect_fragment_fresnel = /* glsl */ `

vec3 viewDir = normalize(cameraPosition - mPosition.xyz);
float intensity = 1.0 - dot( mNormal,viewDir);
gl_FragColor = vec4(uColor,pow(intensity,strength));

`;


// 导出结果
export const fresnel = {
  uniform: { // uniform部分
    shader: "effect_uniform_fresnel",
    location: SHADER_UNIFORM // 插入代码块的锚点 此处表示在uniform内插入，默认在#<common>后面插入
  },
  chunk: { // main函数部分 chunk可以是数组
    shader: "effect_fragment_fresnel",
    location: SHADER_END // 插入代码块的锚点 此处表示在着色器尾处插入
  },
};

