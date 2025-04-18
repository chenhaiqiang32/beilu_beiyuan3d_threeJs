import { Vector3, BufferAttribute } from "three";

/**
 * @description 函数用于处理BufferAttributes中的index和position包含错误数据导致的BoundingBox、BoundingSphere计算错误
 * 对BufferAttribute进行错误数据的剔除
 *  @param {BufferGeometry} geometry*/
export function computeIndex(geometry) {
  const { array, count } = geometry.getIndex();
  const IndexArrayConstructor = array.__proto__.constructor;

  const position = geometry.getAttribute("position");
  const { array: posArray, count: posCount } = position;
  const PositionArrayConstructor = posArray.__proto__.constructor;

  // 创建新的索引数组
  const indexArray = [];

  // 创建新的顶点数据，设置默认值
  const positionArray = new Array(posCount * 3).fill("empty");

  for (let i = 0; i < count; i += 3) {
    const i1 = array[i];
    const i2 = array[i + 1];
    const i3 = array[i + 2];

    // 如果每组三角索引数据中，出现相同的索引，则剔除当前索引
    if (i1 === i2 || i1 === i3 || i2 === i3) {
      continue;
    }

    indexArray.push(i1, i2, i3);

    // 根据索引数据，填充顶点数据
    positionArray[i1 * 3] = posArray[i1 * 3];
    positionArray[i1 * 3 + 1] = posArray[i1 * 3 + 1];
    positionArray[i1 * 3 + 2] = posArray[i1 * 3 + 2];

    positionArray[i2 * 3] = posArray[i2 * 3];
    positionArray[i2 * 3 + 1] = posArray[i2 * 3 + 1];
    positionArray[i2 * 3 + 2] = posArray[i2 * 3 + 2];

    positionArray[i3 * 3] = posArray[i3 * 3];
    positionArray[i3 * 3 + 1] = posArray[i3 * 3 + 1];
    positionArray[i3 * 3 + 2] = posArray[i3 * 3 + 2];
  }

  // 在复制后的顶点数据中，出现从未使用过的坐标数据，这部分数据可能造成错误，所以将这部分数据处理，这里是处理为第0组数据
  const temp = new Vector3().fromBufferAttribute(position, 0);
  for (let i = 0; i < positionArray.length; i += 3) {
    if (positionArray[i] === "empty") {
      positionArray[i] = temp.x;
      positionArray[i + 1] = temp.y;
      positionArray[i + 2] = temp.z;
    }
  }

  const newIndex = new IndexArrayConstructor(indexArray);
  const newPosition = new PositionArrayConstructor(positionArray);
  geometry.setIndex(new BufferAttribute(newIndex, 1));
  geometry.setAttribute("position", new BufferAttribute(newPosition, 3));
}
