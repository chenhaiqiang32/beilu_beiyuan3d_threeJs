import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter";

const link = document.createElement("a");
link.style.display = "none";
link.style.position = "absolute";
document.body.appendChild(link);

// link.click();

export function OBJExport(Object3D, filename) {
  const exporter = new OBJExporter();
  const result = exporter.parse(Object3D);

  saveString(result, filename);
}

export function GLTFExport(Object3D, filename) {
  const exporter = new GLTFExporter();
  exporter.parse(
    Object3D,
    result => {
      if (result instanceof ArrayBuffer) {
        saveArrayBuffer(result, filename);
      } else {
        const output = JSON.stringify(result, null, 2);
        saveString(output, filename);
      }
    },
    error => {
      console.log(error);
    },
  );
}

function save(blob, filename) {
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function saveString(text, filename) {
  save(new Blob([text], { type: "text/plain" }), filename);
}

function saveArrayBuffer(buffer, filename) {
  save(new Blob([buffer], { type: "application/octet-stream" }), filename);
}
