import { ShaderChunk } from "three";
import { SHADER_UNIFORM,SHADER_END } from "../parameters";


/**
 * 科技风效果专用 切换成科技风时修改颜色,颜色不受灯光影响
 */


// 需要增加uniform参数时需要自己定义，然后在使用shaderModify函数时在第三个参数内传入同名的参数
// 比如定义了strength，需要在参数内加入{strength:1.5}或者 {strength:{value:1.5}}

ShaderChunk.effect_uniform_sci_outerLand = /* glsl */ `

uniform vec3 uColor;
uniform float fade;
uniform float land;
`;

ShaderChunk.effect_fragment_sci_outerLand = /* glsl */ `


float d = fade; // 虚化宽度
float t = land; // 非虚化区域
float x = abs(mPosition.x);
float z = abs(mPosition.z);
if(x > t) gl_FragColor.a *= (d - x + t) / d;
if(z > t) gl_FragColor.a *= (d - z + t) / d;

if(uStyle == SCIENCE){
  gl_FragColor = vec4(uColor, gl_FragColor.a);

}
`;


// 导出结果
export const sci_outerLand = {
  uniform: { // uniform部分
    shader: "effect_uniform_sci_outerLand",
    location: SHADER_UNIFORM // 插入代码块的锚点 此处表示在uniform内插入，默认在#<common>后面插入
  },
  chunk: { // main函数部分 chunk可以是数组
    shader: "effect_fragment_sci_outerLand",
    location: SHADER_END // 插入代码块的锚点 此处表示在着色器尾处插入
  },
};

