import { getCurrentPosition } from "./Orientation/personCommon";
import Store3D from "../../main";

export const sceneChange = obj => {
  // 判断室内进入室外，室外进入室内，室内切换，没做切换几种情况
  let state = "noChange";
  const { sceneType,originId } = obj;
  let currentFloor = Store3D.indoorSubsystem.currentFloor; // 当前楼层数据
  let currentFloorName = currentFloor ? currentFloor.name : "";
  let oldScene = Store3D.sceneType;
  if (sceneType === 1 && oldScene === 0) {
    // 室内到室外
    state = "inToOut";
    return state;
  }
  if (sceneType === 0 && oldScene === 1) {
    // 室外到室内
    state = "outToIn";
    return state;
  }
  if ((sceneType === 1 && oldScene === 1) || currentFloorName === originId) {
    state = "noChange";
    return state;
  }
  if (
    sceneType === 0 &&
    oldScene === 0 &&
    originId !== currentFloorName &&
    originId.slice(0,-3) === currentFloorName.slice(0,-3)
  ) {
    // 室内不同楼层
    state = "inToInSingle";
    return state;
  }
  if (
    sceneType === 0 &&
    oldScene === 0 &&
    originId !== currentFloorName &&
    originId.slice(0,-3) !== currentFloorName.slice(0,-3)
  ) {
    // 室内不同楼层
    state = "inToInOther";
    return state;
  }
  return state;
};
export const equipData = data => {

  data.map(equip => {
    const { coordinate,originId,sceneType } = equip;
    equip.position = getCurrentPosition({
      coordinate,
      originId,
      sceneType,
    });
  });
  return data;
};
export const inspectionData = obj => {
  const { coordinate,id,name,originId,sceneType } = obj;
  let originIdDone = originId;
  let positionDone = getCurrentPosition({
    coordinate,
    originId,
    sceneType,
  });

  let inDoorModel = true; // 是否室内建模
  if (sceneType === 0 && !originId.includes("F")) {
    // 室内未建模的建筑
    inDoorModel = false;
  }
  let sceneChangeType = sceneChange({ sceneType,originId });
  return {
    type: "inspection",
    sceneType,
    originId: originIdDone,
    id,
    filter: true,
    sceneChangeType,
    inDoorModel,
    position: positionDone,
    name,
  };
};
export const personDangerData = obj => {
  const { coordinate,id,name,originId,sceneType,alarmTime } = obj;
  let originIdDone = originId;
  let positionDone = getCurrentPosition({
    coordinate,
    originId,
    sceneType,
  });

  let inDoorModel = true; // 是否室内建模
  if (sceneType === 0 && !originId.includes("F")) {
    // 室内未建模的建筑
    inDoorModel = false;
  }
  let sceneChangeType = sceneChange({ sceneType,originId });
  return {
    type: "personDanger",
    sceneType,
    originId: originIdDone,
    id,
    filter: true,
    sceneChangeType,
    inDoorModel,
    position: positionDone,
    name,
    alarmTime,
  };
};
export const doFenceData = child => {
  let newArray = [];
  const { fenceData,originId,sceneType } = child;
  fenceData.map(arr => {
    let objData = {};
    objData.originId = originId;
    objData.position = getCurrentPosition({
      coordinate: arr,
      originId,
      sceneType,
    });
    objData.sceneType = sceneType;
    newArray.push(objData);
  });

  if (!newArray[0].position.equals(newArray[newArray.length - 1].position)) {
    newArray.push(newArray[0]);
  }

  return newArray;
};
export const searchData = obj => {

  const { type,sceneType,originId,id,filter } = obj;

  // 判断搜索对象是否在室内未建模建筑内
  let inDoorModel = !(sceneType === 0 && !originId.includes("F"));

  // 判断搜索对象所在场景
  let sceneChangeType = sceneChange({ sceneType,originId });


  return { type,sceneType,originId,id,filter,sceneChangeType,inDoorModel };
};


export const gatherDangerDate = obj => {
  let { coordinate,id,deviceAlarm,users,level,name,originId,sceneType,radius } = obj;

  let positionDone = getCurrentPosition(
    {
      coordinate,
      originId,
      sceneType,
    },
    true,
  );

  let sceneChangeType = sceneChange({ sceneType,originId });
  return {
    sceneType,
    originId,
    id,
    sceneChangeType,
    position: positionDone,
    name,
    users,
    level,
    radius,
    deviceAlarm,
  };
};

const wrapIfObject = (data) => {
  // 判断数据是否是对象（注意：null 不是对象，而数组是对象类型的一种）
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    // 如果数据是对象但不是数组，则将其包装成数组
    return [data];
  }
  // 如果数据不是对象，或者已经是数组，则直接返回数据
  return data;
};
export const realTimeData = obj => {
  obj.forEach(child => {
    let { originId,sceneType } = child;
    let coordinates = wrapIfObject(child.coordinate);
    child.position = [];
    coordinates.forEach(coordinate => {
      child.position.push(
        getCurrentPosition(
          {
            coordinate,
            originId,
            sceneType,
          },
          true,
        ));
    });

  });
  return obj;
};

export const dangerHistoryData = obj => {
  const { personList,indexList } = obj;
  let personsObj = new Map(); // 人员数据
  personList.forEach(children => {
    const { name,id,type,tracks } = children;
    personsObj.set(id,{ name,id,type,tracks: new Map(),newTracks: new Map() });

    tracks.map((child,cIndex) => {
      let { sceneType,originId,coordinate,index,dataTime } = child;
      if (cIndex === 0) {
        personsObj.get(id).firstIndex = index;
      }
      let visible = !isSceneChange({ sceneType,originId });
      child.visible = visible;
      if (!coordinate) {
        child.position = { x: 0,y: 0,z: 0 };
      } else {
        child.position = getCurrentPosition(
          {
            coordinate,
            originId,
            sceneType,
          },
          true,
        );
      }
      personsObj.get(id).tracks.set(index,child);
    });
  });
  let indexMap = new Map(); // 下标数据
  indexList.forEach(children => {
    const { index,dataTime } = children;
    indexMap.set(index,children);
    personsObj.forEach(value => {
      let hasIndex = value.tracks.get(index);
      if (hasIndex) {
        value.newTracks.set(index,hasIndex);
      }
      if (!hasIndex) {
        // 人中没有这个下标
        if (index < value.firstIndex) {
          // 下标在第一个位置之前
          let cloneTarget = value.tracks.get(value.firstIndex);
          value.newTracks.set(index,{
            visible: false,
            index,
            dataTime,
            sceneType: cloneTarget.sceneType,
            originId: cloneTarget.originId,
            coordinate: cloneTarget.coordinate,
            position: cloneTarget.position,
          });
        } else {
          // 下标在第一个位置之后
          let closestKey = null;
          let minDiff = Infinity;
          // 遍历Map中的键值对，找到小于等于目标数值且最接近目标数值的键
          value.tracks.forEach((value,key) => {
            if (key <= index) {
              const diff = index - key;
              if (diff < minDiff) {
                minDiff = diff;
                closestKey = key;
              }
            }
          });

          let cloneTarget = value.tracks.get(closestKey);
          value.newTracks.set(index,{
            visible: cloneTarget.visible,
            index,
            dataTime,
            sceneType: cloneTarget.sceneType,
            originId: cloneTarget.originId,
            coordinate: cloneTarget.coordinate,
            position: cloneTarget.position,
          });
        }
      }
    });
  });
  return personsObj;
};
export const isSceneChange = obj => {
  // 判断室内进入室外，室外进入室内，室内切换，没做切换几种情况
  let state = false;
  const { sceneType,originId } = obj;
  let currentFloor = Store3D.indoorSubsystem.currentFloor; // 当前楼层数据
  let currentFloorName = currentFloor ? currentFloor.name : "";
  let oldScene = Store3D.sceneType;

  if ((sceneType === 1 && oldScene === 1) || currentFloorName === originId) {
    state = false;
    return state;
  } else {
    state = true;
    return state;
  }
};
