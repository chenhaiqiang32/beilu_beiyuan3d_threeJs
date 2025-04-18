import { Subsystem } from "./Subsystem";
import EquipMentPlate from "../components/business/equipMentPlate/index";
import Store3D from "../../main";
import { typeName } from "../components/Orientation/Orientation";

export class CustomSystem extends Subsystem {
  /**
   * @param {Store3D} core
   */
  constructor(core) {
    super(core);

    this.orientation = core.orientation;
    this.core = core;

  }
  clearPerson() {
    // 清除所有的人
    this.orientation.orientation3D.disposeClusterGroup();
  }
  startFollowPerson(id) {
    // 开始人员跟踪
    this.orientation.setFollowId(id);
    this.orientation.startFollow();
  }
  processingEquipData(data,type) {
    EquipMentPlate.dataProcess(data,type).then(data => {
      // 摄像头加载完毕后
      if (type === "camera" && EquipMentPlate.searchCameraIdNeed) {
        // 存在搜索的相机
        EquipMentPlate.searchEquip(EquipMentPlate.searchCameraIdNeed,"camera");
        EquipMentPlate.searchCameraIdNeed = null;
      }
      if (type === "inspectionSystem" && EquipMentPlate.searchInspectionSystemNeed) {
        // 存在搜索的巡检系统
        EquipMentPlate.searchEquip(EquipMentPlate.searchInspectionSystemNeed,"inspectionSystem");
        EquipMentPlate.searchInspectionSystemNeed = null;
      }
    });
  }
  hideInspectionSystemIcon(data) {
    EquipMentPlate.hideInspectionSystemIcon(data);
  }
  searchPerson(data) {
    // 搜索当前场景人员
    this.orientation.search(data);
  }
  cancelFollowPerson() {
    this.orientation.cancelFollow();
  }
  clearSelected() {
    // onMessage前端弹窗关闭后触发
    if (this.orientation.followId) {
      this.orientation.cancelFollow();
    }
    if (this.orientation.searchId) {
      this.orientation.clearSearch();
    }
  }
  clearCameraVideo(id) {
    EquipMentPlate.closeCameraDialog(id);
    EquipMentPlate.cherryPick(); // 为了保持筛选状态,需要从当前筛选下过滤下人
  }
  cherryPick(data) {
    const filterRules = {
      [typeName[0]]: false,
      [typeName[1]]: false,
      [typeName[2]]: false,
    };
    data.forEach(str => {
      filterRules[str] = true;
    });


    EquipMentPlate.setCherryArray(data);
    this.orientation.filterByRule(filterRules);
    EquipMentPlate.cherryPick(data);
    Store3D.ground.meetingPoint.setCherryArray(data);
    Store3D.ground.meetingPoint.cherryPick();
    Store3D.ground.escapeRoute.setCherryArray(data);
    Store3D.ground.escapeRoute.cherryPick();
    this.core.ground.setFilterBuilding(data);
    this.core.ground.filterBuildingNum();

  }
  setSearchInspection(data) {
    EquipMentPlate.setSearchInspection(data);
  }
  setFollowPersonIdNeed(id) {
  }
  searchCamera(data) {
    // 搜索相机
    EquipMentPlate.searchEquip(data,"camera");
  }
  searchInspectionSystem(data) {
    // 搜索相机
    EquipMentPlate.searchEquip(data,"inspectionSystem");
  }
  searchInspection() {
    const data = EquipMentPlate.searchInspection;
    // 搜索巡检
    EquipMentPlate.dataProcess([data],"inspection"); // 插入巡检
    EquipMentPlate.searchEquip(data.id,"inspection"); // 搜索巡检
    EquipMentPlate.searchInspection = null;
  }
  getSearchPersonId() {
    // 获取搜索人员id
    return this.orientation.searchPersonId;
  }
  getSearchEquipId() {
    // 获取搜索设备id
    return EquipMentPlate.searchCameraId;
  }
  setSearchCameraId(id) {
    EquipMentPlate.searchCameraIdNeed = id;
  }
  setSearchInspectionSystemId(id) {
    EquipMentPlate.searchInspectionSystemNeed = id;
  }
  setDangerPerson(data) {
    // 设置报警人员
    this.orientation.orientation3D.setAlarmPerson(data);
  }
  searchAlarmPerson() {
    this.orientation.orientation3D.searchAlarmPerson();
  }
  clearDangerPerson() {
    // 清除报警人员
    this.orientation.orientation3D.clearAlarmPerson();
  }
  clearEquipType(typeArray) {
    EquipMentPlate.clearEquipType(typeArray);
  }
  hideCameraById(id) {
    EquipMentPlate.hideCameraById(id);
  }
}
