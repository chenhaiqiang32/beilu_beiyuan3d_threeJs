import * as THREE from "three";
import { PathPointList } from "../../../lib/PathPointList";
import { PathGeometry } from "../../../lib/PathGeometry";

export class GatherPath extends THREE.Mesh {
  /**
   * @param {
   * { elapsedTime: {value:number}, seg: {value:number}, position: {value:number} }
   * } options 路径配置
   */

  constructor(points,options = {}) {
    super();
    this.elapsedTime = { value: 0 };
    const seg = { value: options.seg } || { value: 20 };
    const position = { value: options.modelPosition } || { value: 0 };
    const _param = { time: this.elapsedTime,seg: seg,position: position,uColor: options.uColor };

    this.geometry = this.#generateGeometry(points);
    this.material = this.#generateMaterial(_param);
  }

  #generateGeometry(points) {
    const up = new THREE.Vector3(0,1,0);
    const pathPointList = new PathPointList();
    pathPointList.set(points,0.5,10,up,false);
    const geometry = new PathGeometry();
    geometry.update(pathPointList,{
      width: 3.2,
      arrow: false,
      side: "both",
    });
    return geometry;
  }
  #generateMaterial(option) {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uElapseTime: option.time,
        uSeg: option.seg,
        modelPosition: option.position,
        edgeColor: { value: new THREE.Color("#fffffff") },
        uColor: { value: option.uColor || new THREE.Color("#00DC3B") },
      },
      vertexShader: this.#generateVertexShader(),
      fragmentShader: this.#generateFragmentShader(),
      // transparent: true,
      side: THREE.DoubleSide,
      forceSinglePass: true,
    });
    return material;
  }
  #generateVertexShader() {
    return `
      uniform float uElapseTime;
      varying vec2 st;

      #include <common>
      #include <uv_pars_vertex>
      #include <normal_pars_vertex>
      #include <logdepthbuf_pars_vertex>

      void main() {
      	#include <uv_vertex>
      	#include <beginnormal_vertex>
      	#include <defaultnormal_vertex>
      	#include <normal_vertex>
      	#include <begin_vertex>
        st = uv;
      	#include <project_vertex>
      	#include <logdepthbuf_vertex>
      	#include <worldpos_vertex>
      }`;
  }
  #generateFragmentShader() {
    return `
      uniform float uSeg;
      uniform float modelPosition;
      uniform vec3 uColor;
      uniform vec3 edgeColor;
    uniform float uElapseTime;
    varying vec2 st;


      void rotate2d(inout vec2 v, float a) {
       mat2 m = mat2(cos(a), -sin(a), sin(a), cos(a));
       v = m * v;
      }
       float arrow(vec2 av) {
        float line1L = 0.5;
         float line1 = length(av - vec2(clamp(av.x, -line1L, line1L), 0.));
         line1 = smoothstep(0.06, 0.05, line1);

         vec2 rav = av;
         rav.x -= line1L + 0.03;
         rotate2d(rav, 3.1415/1.54);

         float arrowL = 0.39;
         float line2 = length(rav - vec2(clamp(rav.x, 0., arrowL), 0.));
         line2 = smoothstep(0.06, 0.05, line2);

         rotate2d(rav, -3.1415 * 1.3 );
         float line3 = length(rav - vec2(clamp(rav.x, 0., arrowL),0.));
         line3 = smoothstep(0.06, 0.05, line3);

         return clamp(line2 + line3 , 0., 1.);
      }
    #include <common>
    #include <packing>
    #include <color_pars_fragment>
    #include <uv_pars_fragment>
    #include <normal_pars_fragment>
    #include <logdepthbuf_pars_fragment>
    #include <clipping_planes_pars_fragment>

    void main() {
    	#include <logdepthbuf_fragment>
    	#include <normal_fragment_begin>
    	#include <normal_fragment_maps>
     #include <dithering_fragment>

      float p = uSeg; //线段段数
      vec2 nst = (st * 2.0)-1.0;
      vec2 vSt = vec2(fract(nst.x * p- uElapseTime), nst.y);
          vec3 col;
          float a = arrow(vSt) ;
          vec3 cola = uColor;  //底色
          vec3 colb = edgeColor;
          col = mix(cola,colb,a);

          float al = 1.0;
          // float al = a;
          if(abs(0.5 - st.y) >= 0.4){
            float s = smoothstep(0.4, 0.5,abs(0.5 - st.y));
            col = mix(cola,colb,s);
            al = 1.0;
          }
          gl_FragColor = vec4(col,al);
    }
`;
  }
  update(time) {
    this.elapsedTime.value = time;
  }
}
