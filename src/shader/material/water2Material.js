import * as THREE from "three";

import {
  DAY,NIGHT,
  lightingPattern,
  elapsedTime,
  SHADER_END,
  SHADER_UNIFORM,
  DIFFUSE_END,
} from "../parameters";


export function water2Material() {

  const water2Material = new THREE.ShaderMaterial({
    transparent: true,
    vertexShader: water2Vertex,
    fragmentShader: water2Fragment,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: elapsedTime,
      uStyle: lightingPattern
    }
  });
  return water2Material;
}

const water2Vertex = `
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

const water2Fragment = `

${SHADER_UNIFORM}
varying vec2 st;
uniform float uTime;
uniform float uStyle;
#define TAU 6.28318530718
#define MAX_ITER 5


#include <logdepthbuf_pars_fragment>
void main() {


  float time = uTime * .5+23.0;

  vec2 q = st * 0.3;
      vec2 p = mod(q*TAU, TAU)-250.0;

   vec2 i = vec2(p);
   float c = 1.0;
   float inten = .005;

   for (int n = 0; n < MAX_ITER; n++)
   {
    float t = time * (1.0 - (3.5 / float(n+1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0/length(vec2(p.x / (sin(i.x+t)/inten),p.y / (cos(i.y+t)/inten)));
   }
   c /= float(MAX_ITER);
   c = 1.17-pow(c, 1.4);
   vec3 color = vec3(pow(abs(c), 8.0));
      color = clamp(color + vec3(0.0, 0.35, 0.5), 0.0, 1.0);

   if(uStyle == ${DAY}.){
     gl_FragColor = vec4(color, 0.4);
   }else if(uStyle == ${NIGHT}.){
    gl_FragColor = vec4(color*0.1,0.4);
   }

   ${SHADER_END}
 #include <logdepthbuf_fragment>
}
`;
