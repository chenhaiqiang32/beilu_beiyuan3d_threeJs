import { Points, Box3, BufferAttribute, ShaderMaterial, AdditiveBlending, Color, Vector3 } from "three";
import { randomRange } from "../utils/random";
export class Stars extends Points {
  /**
   * @param {number} count
   * @param {Box3} aabb
   */
  constructor(count, aabb) {
    super();

    const { x, y, z } = aabb.max.clone().sub(aabb.min);

    let offset = (x + y + z) / 9;

    const vertices = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const a = randomRange(-x / 2, x / 2);
      const b = randomRange(-y / 2, y / 2);
      const c = randomRange(-z / 2, z / 2);

      const d = new Vector3(a, b, c).length();

      if (d < offset) {
        vertices[i * 3] = a > 0 ? a + offset : a - offset;
        vertices[i * 3 + 1] = b > 0 ? b + offset : b - offset;
        vertices[i * 3 + 2] = c > 0 ? c + offset : c - offset;
      } else {
        vertices[i * 3] = a;
        vertices[i * 3 + 1] = b;
        vertices[i * 3 + 2] = c;
      }
    }

    this.geometry.setAttribute("position", new BufferAttribute(vertices, 3));

    this.material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uSize: {
          value: 230,
        },
        uColor: {
          value: new Color("#F1FDFF"),
        },
      },
      vertexShader: `
            uniform float uSize;

            void main() {
                vec4 viewPosition = viewMatrix * modelMatrix * vec4(position,1.0);
                gl_Position = projectionMatrix * viewPosition;

                gl_PointSize = uSize;
                gl_PointSize *= (70.0 / - viewPosition.z);
            }
            `,
      fragmentShader: `
            uniform vec3 uColor;
            void main() {
                float strength = distance(gl_PointCoord, vec2(0.5));
                strength = 1.0 - strength;
                strength = pow(strength, 10.0);

                vec3 c = vec3( 0.4, 0.4, 0.4);
                vec3 color = mix(vec3(0.0), uColor, strength);
                gl_FragColor = vec4(uColor, strength);
            }
            `,
    });
  }
  update() {
    this.rotation.z += 0.0002;
  }
}
