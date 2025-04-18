export class CrossSearch {
  constructor(core) {
    this.core = core;
    this.crossSearchBuilding = false; // 跨场景搜索建筑
    this.crossSearchInspection = false; // 跨场景搜索巡检设备
    this.crossSearchDangerPerson = false; // 跨场景搜索报警人员
    this.crossSearchPerson = false; // 跨场景搜索场景人
    this.crossFollowPerson = false; // 跨场景跟踪人员
    this.setCrossSearchId = null;
    this.setCrossFollowId = null;
    this.crossGatherWarning = null;
  }
  setCrossGatherWarning(data) {
    this.crossGatherWarning = data;
  }
  setCrossSearchBuildingStatus(status) {
    this.crossSearchBuilding = status;
  }
  setCrossFollowStatus(status) {
    this.crossFollowPerson = status;
  }
  setCrossSearchPersonStatus(status) {
    this.crossSearchPerson = status;
  }
  setCrossSearchInspectionStatus(status) {
    this.crossSearchInspection = status;
  }
  setCrossSearchDangerPersonStatus(status) {
    this.crossSearchDangerPerson = status;
  }
  changeSceneSearch() { // 切换场景查找
    if (this.crossSearchBuilding && this.core.sceneType === 1) {
      // 室内搜索室外的建筑，回到室外之后执行搜索建筑
      this.core.ground.searchBuilding();
      this.crossSearchBuilding = false;
    }
    if (this.crossSearchInspection) {
      // 存在巡检设备
      this.core.currentSystem.searchInspection();
      this.crossSearchInspection = false;
    }
    if (this.crossGatherWarning) {
      this.core.gatherWarning.gatherDangerFun(this.crossGatherWarning);
      this.crossGatherWarning = null;
    }
    if (this.crossSearchPerson) {
      // 搜索人员
      this.core.orientation.setSearchId(this.setCrossSearchId);
      this.core.orientation.search();
      this.core.orientation.personSearchModule.setPosition();
      this.crossSearchPerson = false;
      this.setCrossSearchId = null;
    }
    if (this.crossFollowPerson) {
      // 跟踪人员
      this.core.currentSystem.startFollowPerson(this.setCrossFollowId);
      this.crossFollowPerson = false;
      this.setCrossFollowId = null;
    }
    if (this.crossSearchDangerPerson) {
      //  存在报警人员
      this.core.currentSystem.searchAlarmPerson();
      this.crossSearchDangerPerson = false;
    }
  }
}
