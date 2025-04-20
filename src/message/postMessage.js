export const postOnLoading = () => {
  window.parent.postMessage(
    {
      // 三维开始加载模型
      cmd: "onLoading",
    },
    "*",
  );
};
export const postOnLoaded = () => {
  window.parent.postMessage(
    {
      // 三维结束模型加载
      cmd: "onLoaded",
    },
    "*",
  );
};
export const getInspectionId = data => {
  // 向前端发送请求获取人员
  window.parent.postMessage({ cmd: "inspectionId",param: data },"*");
};
export const postPersonBoard = id => {
  window.parent.postMessage(
    {
      // 调用前端弹窗
      cmd: "personDetail",
      param: id,
    },
    "*",
  );
};
export const closeDialog = () => {
  window.parent.postMessage(
    {
      // 调用前端弹窗
      cmd: "closeDomDialog",
    },
    "*",
  );
};
export const postGatherList = data => {
  window.parent.postMessage(
    {
      // 调用前端弹窗
      cmd: "gatherCallBack",
      param: data
    },
    "*",
  );
};
export const getPerson = data => {
  // 向前端发送请求获取人员
  window.parent.postMessage(
    {
      cmd: "get",
      param: data,
    },
    "*",
  );
};
export const historyTrackTime = time => {
  window.parent.postMessage(
    {
      cmd: "histroyTrackRunning",
      time: time,
    },
    "*",
  );
};
export const historyTrackDone = () => {
  window.parent.postMessage(
    {
      cmd: "histroyTrackDone",
    },
    "*",
  );
};
export const getBuildingDetail = id => {
  window.parent.postMessage(
    {
      cmd: "buildingDetail",
      param: { id },
    },
    "*",
  );
};
export const dblclickBuilding = data => {
  // 向前端发送请求获取人员
  window.parent.postMessage(
    {
      cmd: "dbClickBuilding",
      param: data,
    },
    "*",
  );
};
export const getCameraVideo = data => {
  // 向前端发送请求获取人员
  window.parent.postMessage({ cmd: "cameraVideoId",param: data },"*");
};
export const postBuildingId = data => {
  // 向前端发送点击的楼栋信息，前端查取楼栋人员
  window.parent.postMessage({ cmd: "switchByBuildingId",param: data },"*");
};

export const gatherClick = data => {
  window.parent.postMessage(
    {
      // 点击聚集牌子
      cmd: "clickUnion",
      param: data, // 人员id
    },
    "*",
  );
};



// 预警多人历史轨迹
export const toGatherIndex = data => {
  // 三维告诉前端当前下标
  window.parent.postMessage(
    {
      cmd: "alarmTrackIndex",
      param: data,
    },
    "*",
  );
};

// 预警多人历史轨迹关闭弹窗时候三维通知前端
export const postCloseDialog = () => {
  window.parent.postMessage(
    {
      cmd: "closeDomDialog",
    },
    "*",
  );
};

