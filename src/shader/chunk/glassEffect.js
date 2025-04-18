import { ShaderChunk } from "three";
import { SHADER_UNIFORM,SHADER_END } from "../parameters";


/**
 * 玻璃类型材质特效 夜晚发光，科技风修改颜色(需要针对项目进行修改)
 *
 */


ShaderChunk.effect_uniform_glassEffect = /* glsl */ `
#define USE_WEATHER

`;

ShaderChunk.effect_fragment_glassEffect = /* glsl */ `

vec3 tColor = gl_FragColor.xyz;
vec4 z = diffuseColor;
float q = pow(z.r-z.g,2.0)  + pow(z.r-z.b,2.0) + pow(z.g-z.b,2.0);
float i = step(q,0.02); //q大于0.01时,i为0,反之为1
if(uStyle == NIGHT) {
  float o = step(pow(z.r,2.0),(z.b,2.0));
  vec3 newC = vec3 (0.8, 0.8,0.45);
  gl_FragColor = vec4(mix(tColor,newC, i*o),i +0.8) ;
}else if(uStyle == SCIENCE){
  // 科技风相关修改
  vec3 newC = vec3(0.33,0.768,0.76);
  gl_FragColor = vec4( newC, gl_FragColor.a);
}else{
 gl_FragColor.a = i +0.8 ;
}

// vec4 finalC = gl_FragColor;
// vec4 z = diffuseColor;
// if(uStyle == NIGHT) {
//   float q = pow(z.r-z.g,2.0)  + pow(z.r-z.b,2.0) + pow(z.g-z.b,2.0);
//   float i = step(q,0.01); //q大于0.1012时,i为0,反之为1
//   float o = step(pow(z.r,2.0),(z.b,2.0));
//   vec3 newC = vec3 (0.75, 0.75,0.55);
//   vec4 fc = mix(finalC,vec4( newC, 1.0), i*o);
//   gl_FragColor = fc ; // i为0时返回新颜色,为1时返回原来的原色
// }

`;

// 导出结果
export const glassEffect = {
  uniform: { // uniform部分
    shader: "effect_uniform_glassEffect",
    location: SHADER_UNIFORM // 插入代码块的锚点 此处表示在uniform内插入，默认在#<common>后面插入
  },
  chunk: { // main函数部分
    shader: "effect_fragment_glassEffect",
    location: SHADER_END // 插入代码块的锚点 此处表示在着色器尾处插入
  },
};
