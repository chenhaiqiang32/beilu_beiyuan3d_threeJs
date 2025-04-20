import * as THREE from "three";
import * as TWEEN from "three/examples/jsm/libs/tween.module";
import { Vector2 } from "three";

import {
  DAY,
  NIGHT,
  SCIENCE,
  lightingPattern,
  flowTime,
  glassTime,
  elapsedTime,
  fadeTime,
  lightIndex,
  lightBox,
  SHADER_END,
  SHADER_UNIFORM,
  DIFFUSE_END,
} from "./parameters";

import * as EFFECT from "./chunk";


//定制化公共参数 chunk

const custom_pars_vertex = `



uniform float uElapseTime;
varying vec4 mPosition;
varying vec3 mNormal;
varying vec2 st;


`;

const custom_vertex = `



mNormal = vNormal;
mPosition = modelMatrix * vec4( position, 1.0 );
st = uv;


`;

const custom_pars_fragment = `



uniform float uElapseTime;
varying vec4 mPosition;
varying vec3 mNormal;
varying vec2 st;


`;
const custom_fragment = `
`;

//天气 科技风参数 chunk

const weather_pars_fragment = `

#define DAY ${DAY}.0
#define NIGHT ${NIGHT}.0
#define SCIENCE ${SCIENCE}.0
uniform float uStyle;


`;


THREE.ShaderChunk['custom_pars_vertex'] = custom_pars_vertex;
THREE.ShaderChunk['custom_vertex'] = custom_vertex;
THREE.ShaderChunk['custom_pars_fragment'] = custom_pars_fragment;
THREE.ShaderChunk['custom_fragment'] = custom_fragment;
THREE.ShaderChunk['weather_pars_fragment'] = weather_pars_fragment;

/**
 * @function shaderModify 着色器主函数
 * @param {THREE.Material} material
 * @param {string} effect 着色器特效名称
 * @param {Object} [param={}]
 */

export function shaderModify(shader,effect = "",param = {}) {



  shader.uniforms.uElapseTime = elapsedTime;

  Reflect.ownKeys(param).forEach((key) => {

    if (typeof param[key] === 'object' && param[key] !== null) {
      shader.uniforms[key] = param[key];
      if (param[key] instanceof THREE.Color ||
        param[key] instanceof THREE.Vector2 ||
        param[key] instanceof THREE.Vector3
      ) {
        shader.uniforms[key] = { value: param[key] };
      }
    } else {
      shader.uniforms[key] = { value: param[key] };
    }


  });

  addUniform(shader);
  addChunk(shader,effect);




}



function addChunk(shader,effect) {
  const e = EFFECT[effect];
  if (!e) return;
  const { chunk,uniform,vertex_chunk,vertex_uniform } = e;


  uniform && fragReplace(shader,uniform.location,uniform.shader);
  vertex_uniform && vertexReplace(shader,vertex_uniform.location,vertex_uniform.shader);

  if (chunk) {

    if (Array.isArray(chunk)) {
      chunk.forEach((c) => {
        fragReplace(shader,c.location,c.shader);
      });
    } else {
      fragReplace(shader,chunk.location,chunk.shader);
    }

  }

  if (vertex_chunk) {

    if (Array.isArray(vertex_chunk)) {
      vertex_chunk.forEach((c) => {
        fragReplace(shader,c.location,c.shader);
      });
    } else {
      vertexReplace(shader,vertex_chunk.location,vertex_chunk.shader);
    }

  }


}
function addUniform(shader) {

  if (!shader.vertexShader.includes("#include <custom_pars_vertex>")) {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `
      #include <common>
      #include <custom_pars_vertex>
          `,
    );
  }
  if (!shader.vertexShader.includes("#include <custom_vertex>")) {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      #include <custom_vertex>
          `,
    );
  }
  if (!shader.fragmentShader.includes("#include <custom_pars_fragment>")) {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `
      #include <common>
      #include <custom_pars_fragment>
      #include <weather_pars_fragment>
          `,
    );
  }
  if (!shader.fragmentShader.includes(`${SHADER_UNIFORM}`)) {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `
      #include <common>
      ${SHADER_UNIFORM}
      `,
    );

  }
  if (!shader.fragmentShader.includes(`${DIFFUSE_END}`)) {
    shader.fragmentShader = shader.fragmentShader.replace(
      "vec4 diffuseColor = vec4( diffuse, opacity );",
      `
      vec4 diffuseColor = vec4( diffuse, opacity );
      ${DIFFUSE_END}
      `,
    );

  }
  if (!shader.fragmentShader.includes(`${SHADER_END}`)) {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `
      #include <dithering_fragment>
      ${SHADER_END}
      `,
    );

  }
}


function fragReplace(shader,start,chunk) {
  shader.fragmentShader = shader.fragmentShader.replace(start,
    `#include <${chunk}>
      ${start}`);
}
function vertexReplace(shader,start,chunk) {
  shader.vertexShader = shader.vertexShader.replace(
    start,
    `
#include <${chunk}>
${start}
`,
  );
}

// 风格参数
export function changeLightingPattern(pattern) {
  lightingPattern.value = pattern;
}
export function flowTimeUpdate(type) {
  if (type === 1) {
    const t = new TWEEN.Tween(flowTime).to({ value: 0.0 },5500).start();
  }
  if (type === 2) {
    flowTime.value = 1;
  }
}
export function fadeTimeUpdate(num = 0) {
  const t = new TWEEN.Tween(fadeTime).to({ value: num },1800).start();
}
// 时间参数
export function shaderUpdateTime(time) {
  elapsedTime.value = time;
}
// 玻璃时间参数更改
export function glassTimeUpdate(time) {
  if (time === DAY) {
    const t = new TWEEN.Tween(glassTime).to({ value: 0 },3500).start();
  }
  if (time === NIGHT) {
    const t = new TWEEN.Tween(glassTime).to({ value: 1 },2500).easing(TWEEN.Easing.Quadratic.In).start();
  }

  if (time === SCIENCE) {

  }
}

export const lightIndexUpdate = (function () {
  let a;
  let b;
  return (top,bot) => {
    return new Promise((res,rej) => {
      if (top) {
        a = top;
        b = bot;
        lightBox.value = new THREE.Vector2(top,bot);
        lightIndex.value = bot - 2;
        const t = new TWEEN.Tween(lightIndex)
          .to({ value: top + 2 },1800)
          .start()
          .onComplete(() => {
            res();
          });
      } else {
        const t = new TWEEN.Tween(lightIndex)
          .to({ value: b },1000)
          .start()
          .onComplete(() => {
            lightIndexReset();
            res();
          });
      }
    });
  };
})();
export const lightIndexReset = function () {
  lightIndex.value = -100;
  lightBox.value = new THREE.Vector2(100,-100);
};

