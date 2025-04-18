import { Vector3 } from "three";
import { isInView } from ".";

export function viewFilter(camera, meshes) {
  // const _x = flatGroup(meshes);

  const _res = [];
  if (Array.isArray(meshes)) {
    meshes.forEach(child => {
      let arr = getVertexArray(child);
      let f = false;
      for (let i = 0; i < 8; i++) {
        const v = arr[i];
        if (isInView(camera, v)) {
          f = true;
          break;
        }
      }
      if (f) {
        _res.push(child);
      }
    });
    return _res;
  }

  throw new Error("Expected mesh array , but got wrong type");
}

function getVertexArray(child) {
  const { min, max } = child.geometry.boundingBox;

  const position = child.getWorldPosition(new Vector3());

  const _min = min.clone();
  const _max = max.clone();
  _min.add(position);
  _max.add(position);

  const v1 = new Vector3(_min.x, _min.y, _min.z);
  const v2 = new Vector3(_min.x, _min.y, _max.z);
  const v3 = new Vector3(_min.x, _max.y, _min.z);
  const v4 = new Vector3(_min.x, _max.y, _max.z);
  const v5 = new Vector3(_max.x, _min.y, _min.z);
  const v6 = new Vector3(_max.x, _min.y, _max.z);
  const v7 = new Vector3(_max.x, _max.y, _min.z);
  const v8 = new Vector3(_max.x, _max.y, _max.z);

  return [v1, v2, v3, v4, v5, v6, v7, v8];
}
