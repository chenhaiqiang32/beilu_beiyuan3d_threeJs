import { ShaderChunk } from "three";
import { SHADER_UNIFORM,SHADER_END } from "../parameters";


/**
 * 科技风效果专用 切换成科技风时修改颜色,颜色不受灯光影响
 */


// 需要增加uniform参数时需要自己定义，然后在使用shaderModify函数时在第三个参数内传入同名的参数
// 比如定义了strength，需要在参数内加入{strength:1.5}或者 {strength:{value:1.5}}

ShaderChunk.effect_uniform_sci_playground = /* glsl */ `

uniform float strength;
`;

ShaderChunk.effect_fragment_sci_playground = /* glsl */ `


if(uStyle == SCIENCE){
  vec3 c = vec3(gl_FragColor.r,gl_FragColor.g * 0.88,gl_FragColor.b * 0.55);
  gl_FragColor = vec4(c *strength , gl_FragColor.a );
}
`;


// 导出结果
export const sci_playground = {
  uniform: { // uniform部分
    shader: "effect_uniform_sci_playground",
    location: SHADER_UNIFORM // 插入代码块的锚点 此处表示在uniform内插入，默认在#<common>后面插入
  },
  chunk: { // main函数部分 chunk可以是数组
    shader: "effect_fragment_sci_playground",
    location: SHADER_END // 插入代码块的锚点 此处表示在着色器尾处插入
  },
};

