export const basicVertex = `
varying vec3 vViewPosition;
uniform float uElapseTime;
varying vec4 mPosition;
varying vec3 mNormal;
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
   mNormal = normal;
  mPosition = modelMatrix * vec4( position, 1.0 );
  st = uv;
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
}`;
export const basicFragment = `
uniform float opacity;

varying vec3 vViewPosition;
uniform float uFlowTime;
    uniform float uStyle;
    uniform float uElapseTime;
    uniform vec3 uColor;
    varying vec4 mPosition;
    varying vec3 mNormal;
    varying vec2 st;

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



   gl_FragColor = vec4(1.0,1.0,1.0,1.0);


}
`;
