import { ShaderChunk } from "three";
import { SHADER_UNIFORM,SHADER_END } from "../parameters";


/**
 * 菲涅尔反射
 * @param strength 效果系数
 */


// 需要增加uniform参数时需要自己定义，然后在使用shaderModify函数时在第三个参数内传入同名的参数
// 比如定义了strength，需要在参数内加入{strength:1.5}或者 {strength:{value:1.5}}

ShaderChunk.effect_uniform_gatherFence = /* glsl */ `

uniform float uTime;
uniform vec3 uColor;
uniform float num;
`;

ShaderChunk.effect_fragment_gatherFence = /* glsl */ `

float alpha = smoothstep(0., 1., st.y);
if (st.y > uTime+0.02 && st.y < uTime + 0.16) {
  gl_FragColor = vec4(uColor*(3.4), 1.);
} else {
gl_FragColor = vec4(uColor*(1.2), mix(1.0, 0.0, alpha));
}

`;


// 导出结果
export const gatherFenceEffect = {
  uniform: { // uniform部分
    shader: "effect_uniform_gatherFence",
    location: SHADER_UNIFORM // 插入代码块的锚点 此处表示在uniform内插入，默认在#<common>后面插入
  },
  chunk: { // main函数部分 chunk可以是数组
    shader: "effect_fragment_gatherFence",
    location: SHADER_END // 插入代码块的锚点 此处表示在着色器尾处插入
  },
};

