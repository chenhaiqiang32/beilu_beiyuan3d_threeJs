import { ShaderChunk } from "three";
import { SHADER_UNIFORM,SHADER_END } from "../parameters";


/**
 * 道路流光,用于北元项目
 * @param uSpeed 流光速度
 */


// 需要增加uniform参数时需要自己定义，然后在使用shaderModify函数时在第三个参数内传入同名的参数
// 比如定义了strength，需要在参数内加入{strength:1.5}或者 {strength:{value:1.5}}

ShaderChunk.effect_uniform_pathFlow = /* glsl */ `

uniform float uSpeed;
#define USE_WEATHER
`;

ShaderChunk.effect_fragment_pathFlow = /* glsl */ `

vec3 c = vec3(0.98, 0.678, 0.033);
float a = 1.0;
float p = 5.0; //线段段数

// float r = step(0.5, fract(st.x * p - uElapseTime));
// float fade = (fract(st.x * p - uElapseTime) * 2.0) - 1.0;
// float r = step(0.2, mod(st.x * p - uElapseTime * uSpeed, 1.0));
//  float fade = (mod(st.x * p - uElapseTime * uSpeed, 1.0) * 2.0) - 1.0;
// a =  r * fade;

// gl_FragColor = vec4(0.909, 0.678, 0.133,a + fade);
float fade = fract(st.x * p - uElapseTime* uSpeed);
float offset = 0.5;
float r = step(offset, fade);
float _a = 1.0 - abs(fade - 0.5 - offset / 2.0 )*4.0;

_a = _a * pow(( 1.0 - abs( st.y - 0.5 )), 2.0 );

_a = step(0.25,_a)*_a;
gl_FragColor = vec4(c,_a * r);

if(uStyle == NIGHT){
gl_FragColor = vec4(c,_a * r + 0.12);

}
if(uStyle == SCIENCE){
gl_FragColor = vec4(c,_a * r + 0.12);

}
`;


// 导出结果
export const pathFlow = {
  uniform: { // uniform部分
    shader: "effect_uniform_pathFlow",
    location: SHADER_UNIFORM // 插入代码块的锚点 此处表示在uniform内插入，默认在#<common>后面插入
  },
  chunk: { // main函数部分 chunk可以是数组
    shader: "effect_fragment_pathFlow",
    location: SHADER_END // 插入代码块的锚点 此处表示在着色器尾处插入
  },
};

