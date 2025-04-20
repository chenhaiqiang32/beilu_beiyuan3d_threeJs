import { Object3D, BufferGeometry, Material, Texture, ShaderMaterial } from "three";

/**
 * Dispose of all Object3D`s nested Geometries, Materials and Textures
 *
 * @param object  Object3D, BufferGeometry, Material or Texture
 * @param disposeMedia If set to true will dispose of the texture image or video element, default false
 */
function deepDispose(object) {
  const dispose = object => object.dispose();
  const disposeObject = object => {
    if (object.dispose) dispose(object);
    if (object.geometry) dispose(object.geometry);
    if (object.skeleton) dispose(object.skeleton);
    if (object.material) traverseMaterialsTextures(object.material, dispose, dispose);
  };

  if (object instanceof BufferGeometry || object instanceof Texture) return dispose(object);

  if (object instanceof Material) return traverseMaterialsTextures(object, dispose);

  disposeObject(object);

  if (object.traverse) object.traverse(obj => disposeObject(obj));
}

/**
 * Traverse material or array of materials and all nested textures
 * executing there respective callback
 *
 * @param material          Three js Material or array of material
 * @param dispose           dispose function
 */
function traverseMaterialsTextures(material, dispose) {
  const traverseMaterial = mat => {
    dispose(mat);

    Object.values(mat)
      .filter(value => value instanceof Texture)
      .forEach(texture => dispose(texture));

    if (mat.uniforms)
      Object.values(mat.uniforms)
        .filter(({ value }) => value instanceof Texture)
        .forEach(({ value }) => dispose(value));
  };

  if (Array.isArray(material)) {
    material.forEach(mat => traverseMaterial(mat));
  } else traverseMaterial(material);
}

export { deepDispose };
