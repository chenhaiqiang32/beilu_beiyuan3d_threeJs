import { createCSS2DObject,createCSS3DSprite } from "../../../lib/CSSObject";

export const createBuildingNameLabel = (innerText,fun) => {
  let labelEle = document.createElement("div");
  let labelEleOut = document.createElement("div");
  labelEleOut.append(labelEle);
  labelEleOut.draggable = false;
  labelEleOut.className = "beilu_three_Board_text_person";
  labelEle.innerText = innerText;
  let css2d = createCSS2DObject(labelEleOut);

  if (fun) {
    labelEle.onclick = () => {
      fun(css2d);
    };
  }
  return css2d;
};
export const createBuildingInfoLabel = (innerText,visible = false) => {
  let labelEle = document.createElement("div");
  let labelEleOut = document.createElement("div");
  labelEleOut.append(labelEle);
  labelEleOut.draggable = false;
  labelEleOut.className = "buildingNum";
  labelEle.innerText = innerText;
  let css2d = createCSS2DObject(labelEleOut);
  css2d.visible = visible;

  return css2d;
};
