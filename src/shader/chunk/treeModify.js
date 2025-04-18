import { ShaderChunk } from "three";
import { SHADER_UNIFORM,SHADER_END } from "../parameters";


/**
 * 树木处理，科技风修改颜色(需要针对项目进行修改)
 *
 */


ShaderChunk.effect_uniform_treeModify = /* glsl */ `
#define USE_WEATHER
uniform vec3 uColor;

`;

ShaderChunk.effect_fragment_treeModify = /* glsl */ `

// 微调树叶颜色,从内到外变浅
// vec3 newC = vec3 (0.12, 0.66,0.168);
// vec3 woodC = vec3(0.21, 0.098,0.0156);
// vec3 leaf = vec3( gl_FragColor.rgb*pow((1.0 - st.y) * 0.91, 1.0));
// vec3 wood = vec3( gl_FragColor.rgb*pow((1.0 - st.x) * 0.86, 1.0));
// gl_FragColor = vec4(mix(leaf,wood,0.85 - st.x ),gl_FragColor.a );

if(uStyle == SCIENCE){
  // 科技风相关修改
  vec3 newC = vec3 (0.08, 0.79,0.195);
  gl_FragColor = vec4( newC, pow((1.0 - st.y) * 0.85, 5.0));
}

`;

// 导出结果
export const treeModify = {
  uniform: { // uniform部分
    shader: "effect_uniform_treeModify",
    location: SHADER_UNIFORM // 插入代码块的锚点 此处表示在uniform内插入，默认在#<common>后面插入
  },
  chunk: { // main函数部分
    shader: "effect_fragment_treeModify",
    location: SHADER_END // 插入代码块的锚点 此处表示在着色器尾处插入
  },
};
