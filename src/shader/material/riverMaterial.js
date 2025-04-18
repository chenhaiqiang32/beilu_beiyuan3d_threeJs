import * as THREE from "three";

import {
  DAY,NIGHT,SCIENCE,
  lightingPattern,
  elapsedTime,
  SHADER_END,
  SHADER_UNIFORM,

  flowTime
} from "../parameters";


export function windMaterial() {

  const windMaterial = new THREE.ShaderMaterial({
    transparent: true,
    vertexShader: windVertex,
    fragmentShader: windFragment,
    side: THREE.DoubleSide,
    uniforms: {
      uFlowTime: flowTime,
      uStyle: lightingPattern
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
uniform float uFlowTime;

#define DAY ${DAY}.0
#define NIGHT ${NIGHT}.0
#define SCIENCE ${SCIENCE}.0
uniform float uStyle;

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


  vec2 newSt = vec2(2.0 * st.y - pow(st.y,2.0), st.x*50.0-(uElapseTime * 2.5));
  float z = fbmA(fbmA(newSt) + newSt);

  vec3 color = mix(
  vec3(0.081,0.519,0.966),
  vec3(0.8,0.8,0.891),
  clamp(z*z*z*1.2,0.0,1.0)
 );

 if(uStyle == DAY){
  gl_FragColor = vec4(color*(z*z*z+0.6*z*z+0.5*z),0.35);
 }else if(uStyle == SCIENCE){
  gl_FragColor = vec4(color*(z*z*z+0.6*z*z+0.5*z),1.);
 }else {
  vec3 mixColor = mix(color,vec3(0.0,0.0,0.0),0.5);
  gl_FragColor = vec4(mixColor*(z*z*z+0.6*z*z+0.5*z),.15);
 }

   ${SHADER_END}
 #include <logdepthbuf_fragment>
}
`;
