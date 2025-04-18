import { Vector3 } from "three";
import { getCurrentPosition } from "../Orientation/personCommon";

// 涉及业务的点位处理,不同项目处理方案不同
export function dataProcess(data) {
  const track = data; // 原始数据
  const pointForAvatar = []; // 用来绘制路径动画的点,y轴不做改变
  const pointsForPath = []; // 用来绘制路径的点，y轴比人员定位的点高
  const buildings = [];
  if (track.length === 1) {
    // 容错,如果只传入一个点位,则复制该点位,模型原地静止
    let item = JSON.parse(JSON.stringify(track[0]));
    track.push(item);
  }
  for (let i = 0; i < track.length; i++) {
    // 给每一个点增加一定高度,防止路径重叠
    let position = getCurrentPosition(track[i],true);
    let point = new Vector3(position.x,position.y,position.z);
    pointForAvatar.push(point);
    let pointForPath = point.clone();
    pointForPath.y = pointForPath.y + (i + 1) * 0.00005; // 增加路径高度
    pointsForPath.push(pointForPath);

    const originId = track[i]['originId'];
    const building = originId.substring(0,originId.length - 3);
    if (track[i]['sceneType'] === 0 && !buildings.includes(building)) {
      // 找出涉及的漏洞，踢出楼层编号部分
      buildings.push(building);
    }
  }
  return { pointForAvatar: pointForAvatar,pointsForPath: pointsForPath,buildings: buildings };
}
