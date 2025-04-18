import * as THREE from "three";

import {
  DAY,NIGHT,
  lightingPattern,
  elapsedTime,
  SHADER_END,
  SHADER_UNIFORM,
  DIFFUSE_END,
} from "../parameters";


export function windMaterial() {

  const windMaterial = new THREE.ShaderMaterial({
    transparent: true,
    vertexShader: windVertex,
    fragmentShader: windFragment,
    side: THREE.DoubleSide,
    uniforms: {
      uElapseTime: elapsedTime,
    }
  });
  return windMaterial;
}

const windVertex = `
#include <logdepthbuf_pars_vertex>
#include <common>
${SHADER_UNIFORM}
varying vec2 st;

void main(){
  st = uv;

  #include <begin_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
}
`;

const windFragment = `

${SHADER_UNIFORM}
varying vec2 st;
uniform float uElapseTime;

float randomA(vec2 st){
  return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453);
}
float noiseA(vec2 st) {
  vec2 i = floor(st.xy);
  vec2 f = fract(st.xy);
  f = smoothstep(0.0,1.0,f);
  float a = randomA(i);
  float b = randomA(i + vec2(1.0,0.0));
  float c = randomA(i + vec2(0.0,1.0));
  float d = randomA(i + vec2(1.0,1.0));
  float mixN = mix(a,b,f.x); // 相当于a * (1.0 - f.x) + b * f.x
  float z = a * (1.0 - f.x) + b * f.x + (c - a) * f.y * (1.0 - f.x) + (d - b) * f.y * f.x;
  return z;
}
float fbmA(vec2 st) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 2.0;
  for(int i=0; i<6; i++) {
      value += amplitude*noiseA(st);
      st *= frequency;
      amplitude *= 0.5;
  }
return value;
}



#include <logdepthbuf_pars_fragment>
void main() {


  vec2 newSt = vec2(2.0 * st.y - pow(st.y,2.0), st.x*10.0-(uElapseTime * 4.5));
  float z = fbmA(fbmA(newSt) + newSt);
  vec3 color = vec3(1.0);

 color = mix(
  vec3(0.6, 0.6, 0.6),
  vec3(0.2, 0.4, 0.4),
  clamp(z*1.2,0.0,1.0)
 );

gl_FragColor = vec4(color,0.35);

   ${SHADER_END}
 #include <logdepthbuf_fragment>
}
`;
