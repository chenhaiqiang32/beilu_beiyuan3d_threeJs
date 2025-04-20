import { FileLoader, Vector3, Loader } from "three";

/**这个加载器用于加载 ".obj" 格式的线 */
export class GbkOBJLoader extends Loader {
    constructor(manager) {
        super(manager);
    }

    /**
     * 同步加载
     * @param {string} url 文件路径
     * @param {( object: { name: string; vertices: Vector3[]; }[] ) => void} onLoad 加载完成回调函数
     * @param {( event: ProgressEvent<EventTarget> ) => void} onProgress
     * @param {( err: unknown ) => void} onError
     */
    load(url, onLoad, onProgress, onError) {
        const scope = this;
        const loader = new FileLoader(this.manager);

        loader.load(url, text => onLoad(scope.parse(text)), onProgress, onError);
    }

    /**
     * 异步加载
     * @param {string} url
     * @param { ( event: ProgressEvent<EventTarget> ) => void } onProgress
     * @returns {Promise<{ name: string; vertices: Vector3[]; }[]>}
     */
    loadAsync(url, onProgress) {
        return new Promise((resolve, reject) => {
            this.load(url, resolve, onProgress, reject);
        });
    }

    /**
     * 字符串解析
     * @param text
     * @returns { {name:string,vertices:Vector3[]}[] }
     */
    parse(text) {
        // /\r\n/g: 这是一个正则表达式，用于匹配字符串中的所有\r\n（回车+换行）组合。
        if (text.indexOf("\n") !== -1) {
            text = text.replace(/\r\n\s+/g, "\n");
        }

        if (text.indexOf("\\\n") !== -1) {
            // join lines separated by a line continuation character (\)
            text = text.replace(/\\\n/g, "");
        }

        const lines = text.split("\n");

        let line = "",
            lineFirstChar = "";
        const result = [];
        let vertices = [];

        // Faster to just trim left side of the line. Use if available.
        for (let i = 0, l = lines.length; i < l; i++) {
            line = lines[i];

            line = line.trim();

            if (line.length === 0) continue;

            lineFirstChar = line.charAt(0);

            // @todo invoke passed in handler if any
            if (lineFirstChar !== "o" && lineFirstChar !== "v") continue;

            if (lineFirstChar === "o") {
                const name = line.split(/\s+/)[1];
                result.push({ name, vertices });
                vertices = [];
            } else if (lineFirstChar === "v") {
                let data = line.split(/\s+/);
                vertices.push(new Vector3(parseFloat(data[1]), parseFloat(data[2]), parseFloat(data[3])));
            } else {
            }
        }
        return result;
    }
}

export default GbkOBJLoader;
