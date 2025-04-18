import Store3D from "../main";
import {
  doFenceData,
  equipData,
  inspectionData,
  personDangerData,
  gatherDangerDate,
  sceneChange,
  searchData,
  realTimeData,
  dangerHistoryData
} from "../three/components/dataProgress";
import { SUNNY,RAIN,SNOW,DAY,NIGHT,SCIENCE } from "../three/components/weather";

// 因为管控部分版本没有更新，所以需要这个映射表
const TransformMap = {
  sunny: SUNNY,
  rain: RAIN,
  snow: SNOW,
  day: DAY,
  night: NIGHT,
  science: SCIENCE,
  [SUNNY]: SUNNY,
  [RAIN]: RAIN,
  [SNOW]: SNOW,
  [DAY]: DAY,
  [NIGHT]: NIGHT,
  [SCIENCE]: SCIENCE,
};

export const onMessage = () => {
  window.addEventListener("message",event => {
    if (event.data && event.data.cmd) {
      switch (event.data.cmd) {
        case "changeLighting": {
          const param = TransformMap[event.data.param];
          Store3D.changeLighting(param);
          break;
        }
        case "changeWeather": {
          const param = event.data.param;
          param.type = TransformMap[param.type];
          Store3D.changeWeather(param);
          break;
        }
        case "close": {
          Store3D._stopRender();
          break;
        }
        case "open": {
          Store3D._beginRender();
          break;
        }
        case "setCameraState": {
          Store3D.setCameraState(event.data.param);
          break;
        }
        case "changeSystem": {
          Store3D.changeSystem(event.data.param);
          break;
        }
        case "setWanderState": {
          if (event.data.param) {
            Store3D.beginWander();
          } else {
            Store3D.endWander();
          }
          break;
        }
        case "startMeasuring": {
          Store3D.startMeasuring();
          break;
        } // 开启测距

        case "removeMeasuring": {
          Store3D.removeMeasuring();
          break;
        } // 关闭测距

        case "startMeasureArea": {
          Store3D.startMeasureArea();
          break;
        } // 开启测面积

        case "removeMeasureArea": {
          Store3D.removeMeasureArea();
          break;
        } // 清除测面积

        // 设置热力图
        case "setHeatmap": {
          Store3D.setHeatmap(event.data.param);
          break;
        }

        case "init": {
          Store3D.orientation.init(event.data.param);
          let followId = Store3D.orientation.followId; // 跟踪信息
          if (followId) {
            Store3D.followCheck(event,followId);
          }
          break;
        }

        case "getInspectin": {

          // 获取巡检点的数据
          let inspection = inspectionData(event.data.param);
          Store3D.search(inspection);

          break;
        }
        case "removeInset": {
          // 清除设备
          Store3D.clearEquipType(event.data.param);
          break;
        }
        case "getCameraList": {
          const { data } = event.data.param;
          let cameraData = equipData(data); // 数据处理
          Store3D.processingEquipment(cameraData,"camera");
          break;
        } // 摄像头的列表
        case "inspectionSystem_initialData": // 巡检系统
          let data = equipData(event.data.param); // 数据处理
          Store3D.processingEquipment(data,"inspectionSystem");
          break;
        case "hideInspectionSystemIcon": {
          Store3D.hideInspectionSystemIcon(event.data.param);
        }
        case "getBeaconList": {
          const { data } = event.data.param;
          let beaconData = equipData(data); // 数据处理
          Store3D.processingEquipment(beaconData,"beacon");
          break;
        } // 星标列表

        case "trackInit":
        case "trackStart":
        case "trackStop":
        case "trackSpeedUp":
        case "trackSpeedDown":
        case "trackProgress":
        case "trackAngleSwitch":
        case "trackClear": {
          Store3D.historyTrackCommand(event.data);
          break;
        } // 清除

        case "buildingNumber": {
          let buildingNumber = event.data.param;
          Store3D.changeBuildingNum(buildingNumber);
          break;
        } // 改变建筑牌子上显示的人员数据

        case "buildingList": {
          const data = event.data.param;
          // console.log(data);
          break;
        }

        case "cherryPick": {
          Store3D.cherryPick(event.data.param); // 筛选
          break;
        }

        case "startSelect": {
          Store3D.changeBoxSelect(event.data.param); // 框选
          break;
        }

        case "reSelect": {
          Store3D.reSelect();
          break;
        }

        // todo fenceList 需要等前端弄好后重新调整
        case "fenceList": {
          event.data.param.data.map(child => {
            const { id,name,type } = child;
            let fenceDataNew = doFenceData(child);

            let fenceObj = {
              fenceData: fenceDataNew,
              id,
              name,
              type: 'area',
            };
            Store3D.createFence(fenceObj); //
          });
          break;
        } // 围栏列表

        case "cancelDrawFence": {
          // 清除围栏
          Store3D.clearFence();
          const resetCamera = Store3D.currentSystem.resetCamera ?
            Store3D.currentSystem.resetCamera.bind(Store3D.currentSystem) : null;
          resetCamera && resetCamera();
          break;
        }
        case "startSearch": {
          let data = searchData(event.data.param); // 数据处理
          Store3D.search(data);
          break;
        }
        case "closeDialog": {
          // 关闭人员弹窗
          if (Store3D.isIndoorModel()) {
            Store3D.hideBuildingDialog();
            Store3D.setIndoorModel(false);
          }
          let personId = event.data.param;
          if (!Store3D.ground.boxSelectStatus) { // 不是框选状态
            Store3D.bindGroundEvent();
          }

          Store3D.clearSelected(personId);
          break;
        }

        case "personFollow":
          const { id,sceneType,originId } = event.data.param;
          let sceneChangeType = sceneChange({ sceneType,originId });

          Store3D.startFollow({ id,originId,sceneType,sceneChangeType });
          break;
        case "removePersonFollow": {
          // 解除跟踪
          Store3D.bindSearchEvent(); // 绑定搜索事件
          Store3D.cancelFollow();
          break;
        }
        case "changeBuildingFloor": {
          // 切换楼层
          Store3D.changeFloor(event.data.param);
          // Store3D.changeFloor(event.data.param);
          break;
        }
        case "goBack": {
          Store3D.changeSystem("ground");

          break;
        }
        case "removeAllPerson": {
          // 清除所有的人
          Store3D.clearAllPerson();
          break;
        }
        case "personDanger": {
          // 人员报警
          let dangerData = personDangerData(event.data.param); // 数据处理
          Store3D.search(dangerData);
          break;
        }
        case "areaDanger": {
          // 区域报警
          const { fenceData,id,name,type,originId,sceneType } = event.data.param;
          let fenceDataNew = doFenceData(event.data.param);
          let fenceObj = {
            fenceData: fenceDataNew,
            id,
            name,
            type: "danger"
          };
          Store3D.dangerFenceInit(fenceObj);
          break;
        }
        case "clearDanger": {
          // 清除报警
          Store3D.clearDanger();
          break;
        }
        case "closeBuildingDialog": {
          // 关闭建筑弹窗
          let buildingId = event.data.param;
          Store3D.bindGroundEvent();
          Store3D.hideBuildingDialog(buildingId);
          break;
        }
        case "closeCameraDialog": {
          // 关闭设备弹窗
          if (Store3D.isIndoorModel()) {
            Store3D.hideBuildingDialog();
            Store3D.setIndoorModel(false);
          }
          let cameraId = event.data.param;
          Store3D.bindGroundEvent();
          Store3D.hideCameraDialog(cameraId);
          break;
        }
        case "hideCameraIcon": {
          // 如果显示了未筛选的相机时候触发
          Store3D.hideCameraById(event.data.param);
          break;
        }
        case "mouseEventSwitch":

          Store3D.changeMouseEventSwitch(event.data.param);
          break;
        case "switchGather": {
          // 切换聚集
          Store3D.switchGatherStatus(event.data.param);
          break;
        }
        case "setGatherLevel": {
          // 设置聚集等级
          Store3D.setGatherLevel(event.data.param);
          break;
        }
        case "roamEnabled": {
          Store3D.roamEnabled(event.data.param);
          break;
        }
        case "roamDuration": {
          Store3D.roamDuration(event.data.param);
          break;
        }


        // 预警多人历史轨迹

        case "alarmTrackInit": {
          let param = event.data.param;
          let data = dangerHistoryData(param);
          Store3D.personsHistory.init(data);
          break;
        }
        case "alarmTrackClear": {
          Store3D.personsHistory.dispose();
          break;
        }
        case "alarmTrackProgess": {
          // 拖动进度条
          let param = event.data.param.progress;
          Store3D.personsHistory.setTime(param);
          break;
        }
        case "alarmTrackStart": {
          Store3D.personsHistory.pause(false);
          break;
        }
        case "alarmTrackStop": {
          Store3D.personsHistory.pause(true);
          break;
        }
        case "alarmTrackSpeedChange": {
          // 变速
          let param = event.data.param.val;
          Store3D.personsHistory.changeSpeed(param);
          break;
        }
        case "gatherDanger": {
          // 聚集报警
          let data = gatherDangerDate(event.data.param);
          Store3D.gatherWarning.gatherDanger(data);
          break;
        }
        case "gatherNow": {
          // 聚集报警
          let data = realTimeData(event.data.param);
          Store3D.gatherWarning.realTimeGather(data);
          break;
        }
        case "clearGatherDanger": {
          Store3D.gatherWarning.disposeGather();
          break;
        }
        case "factoryChange": {
          let clearFence = Store3D.currentSystem.clearBuildingFence ?
            Store3D.currentSystem.clearBuildingFence.bind(Store3D.currentSystem) :
            null;
          clearFence && clearFence();

          const data = doFenceData(event.data.param[0]);

          const { id,name,type } = event.data.param[0];
          // 厂区切换只有一组数据
          let fenceObj = {
            fenceData: data,
            id,
            name,
            type: 'building',
          };

          Store3D.createFence(fenceObj); //
          break;
        }
        case "gatherOrSilentArea": { // 聚集预警/静默 区域
          event.data.param.forEach(param => {
            param.areaDataOut.push(param.areaDataOut[0]);
            Store3D.ground.gatherOrSilentPlate.create(param); // 地面广场创建预警区域
            if (param.areaType === 3) { // 室内楼层预警
              Store3D.indoorSubsystem.setFloorGatherOrSilent(param);
            }
          });
          break;
        }
        case 'clearGatherOrSilentArea': {
          Store3D.ground.gatherOrSilentPlate.dispose();
          Store3D.indoorSubsystem.disposeGatherOrSilent();
          break;
        }
        case 'escapeRoute': {
          Store3D.ground.escapeRoute.init(event.data.param);
          break;
        }
        case 'clearEscapeRoute': {
          Store3D.ground.escapeRoute.dispose();
          break;
        }
        case 'meetingPoint': {
          event.data.param.forEach((child,index) => {
            Store3D.ground.meetingPoint.create({ id: index,name: String(index),position: child });
          });
          break;
        }
      }
    }
  });
};

