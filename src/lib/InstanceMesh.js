import * as THREE from "three";

export function createInstanceMesh(object,positions = [],rotations = false,scale = 1) {
  if (object instanceof THREE.Mesh) {
    const { geometry,material } = object;
    const mesh = new THREE.InstancedMesh(geometry,material,positions.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    if (!positions || positions.length === 0) {
      console.error(`${object.name}:创建实例化对象，无位置信息`);
      return new THREE.Group();
    }

    positions.forEach((position,index) => {
      // 矩阵
      const matrix = new THREE.Matrix4();

      let _scale = 1;

      if (Array.isArray(scale)) {
        const [min,max] = scale;
        _scale = min + Math.random() * (max - min);
      } else {
        _scale = parseFloat(scale);
      }

      matrix.makeScale(_scale,_scale,_scale);
      matrix.setPosition(position);
      if (rotations) {
        if (rotations.length) {
          const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(rotations[index]);
          matrix.multiply(rotationMatrix);
        } else {
          matrix.multiply(new THREE.Matrix4().makeRotationY(Math.random() * Math.PI * 2));
        }
      }

      mesh.setMatrixAt(index,matrix);
      mesh.castShadow = true;
    });

    return mesh;
  } else if (object instanceof THREE.Group) {
    const group = new THREE.Group();
    object.traverse(child => {
      if (child instanceof THREE.Mesh) {
        group.add(createInstanceMesh(child,positions,rotations,scale));
      }
    });
    return group;
  } else {
    const group = new THREE.Group();
    object.children.forEach(item => {
      group.add(createInstanceMesh(item,positions,rotations,scale));
    });
    return group;
  }
}
