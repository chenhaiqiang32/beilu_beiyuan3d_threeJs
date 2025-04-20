const LoadingDOM = document.createElement("div");
LoadingDOM.style.position = "fixed";
LoadingDOM.style.zIndex = "9";
LoadingDOM.style.top = "0px";
LoadingDOM.style.left = "0px";
LoadingDOM.style.width = "100%";
LoadingDOM.style.height = "100%";
LoadingDOM.style.display = "none";
LoadingDOM.style.textAlign = "center";
LoadingDOM.style.flexDirection = "column";
LoadingDOM.style.justifyContent = "center";
LoadingDOM.style.alignItems = "center";
LoadingDOM.style.userSelect = "none";
document.body.appendChild(LoadingDOM);

const loading = document.createElement("img");
loading.src = "./loading.webp ";
LoadingDOM.appendChild(loading);

const preTextContext = "Loading... ";
const TextDom = document.createElement("span");
TextDom.style.fontSize = "24px";
TextDom.style.opacity = "1";
TextDom.style.color = "#FFFFFF";
LoadingDOM.appendChild(TextDom);

export const loadingInstance = {
  service(percent) {
    LoadingDOM.style.display = "flex";
    TextDom.innerHTML = preTextContext + percent + "%";
  },
  close() {
    LoadingDOM.style.display = "none";
    TextDom.innerHTML = preTextContext + 0 + "%";
  },
};
