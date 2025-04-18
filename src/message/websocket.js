import Store3D from "../main";
const url = `${window.configs.BASE_API}/gis/web/systemConfig/query?systemName=${window.configs.positionMapName}`;

let wsUrl = authCode => ` ${window.configs.websocket}?type=2&authCode=${authCode}&sysId=2`; //

export function openWebsocket() {
    fetch(url, {
        headers: {
            Authorization: `bearer${localStorage.getItem("token")}`,
        },
    })
        .then(res => {
            return res.text();
        })
        .then(res => {
            const { data } = JSON.parse(res);
            const { authCode } = data[0];
            connect(wsUrl(authCode));
        });
}

let socket = null;
let keepaliveTimer = null;

function connect(url) {
    socket = new WebSocket(url);

    socket.onopen = onopen; //socket连接成功处理事件
    socket.onclose = onclose; //socket连接关闭处理事件
    socket.onmessage = onmessage; //socket接收到新消息

    clearInterval(keepaliveTimer);

    keepaliveTimer = setInterval(() => {
        if (socket) {
            socket.send("keepalive");
        }
    }, 5000);
}

function onopen() {}

function onclose(event) {
    setTimeout(function () {
        connect(event.target.url);
    }, 5000);
}

function onmessage(event) {
    let type = ["Car", "Person"];

    let data = JSON.parse(event.data); // 处理数据
    if (type.includes(data.type)) {
        // todo 制造数据
        let dataArray = [
            {
                distance: 33.994799351431304,
                id: "00002",
                name: "史建伟1",
                opCode: 1,
                resType: "Person",
                tunnelCode: "001",
            },
            {
                distance: 33.994799351431304,
                id: "00004",
                name: "史建伟2",
                opCode: 1,
                resType: "Person",
                tunnelCode: "002",
            },
        ];
        data.data[1] = dataArray[0];
        data.data[2] = dataArray[1];
        Store3D.initOrientationData(data);
        setInterval(() => {
            let newDate = {
                reset: false,
                data: [
                    {
                        distance: Math.random() * 100,
                        id: "00002",
                        name: "史建伟1",
                        opCode: 5,
                        resType: "Person",
                        tunnelCode: "001",
                    },
                    {
                        distance: Math.random() * 100,
                        id: "00004",
                        name: "史建伟2",
                        opCode: 5,
                        resType: "Person",
                        tunnelCode: "002",
                    },
                ],
            };
            Store3D.initOrientationData(newDate);
        }, 2000);
    }
}
