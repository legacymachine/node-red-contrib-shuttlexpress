module.exports = function(RED) {

    const HID = require("node-hid");
    const usbDetect = require("usb-detection");

    function ShuttleXpressConfigNode(n) {
        RED.nodes.createNode(this, n);
        this.vid = n.vid;
        this.pid = n.pid;
    }

    function ShuttleXpressNode(config) {

        //console.log("config:", config);

        RED.nodes.createNode(this, config);

        const node = this;

        node.connection = RED.nodes.getNode(config.connection);
        //console.log("connection:", node.connection);

        const VID = Number(node.connection.vid);
        const PID = Number(node.connection.pid);

        let shuttleXpress = null;

        // Start Monitoring USB devies for detection
        usbDetect.startMonitoring();

        usbDetect.find(VID, PID, function(err, devices) { 
            //console.log(`find:${VID}:${PID}`, devices, err);
            const device = devices.find(device => (device.vendorId === VID && device.productId === PID));
            //console.log("device:", device);
            if (device) usbDetect.emit(`add:${VID}:${PID}`, device);
        });

        usbDetect.on(`add:${VID}:${PID}`, function(device) {

            //console.log(`add:${VID}:${PID}`, device);

            let shuttlePrev = Buffer.alloc(5).toJSON().data;

            try {

                shuttleXpress = new HID.HID(VID, PID);

                shuttleXpress.on("data", function(data) {

                    // data is a Buffer

                    const shuttleData = data.toJSON().data;

                    const shuttle = parseShuttleData(shuttleData, shuttlePrev);

                    if (shuttle !== null) {
                        shuttlePrev = shuttle.shuttlePrev;

                        shuttle.shuttleStatus.data = data;
                        console.log("shuttleStatus:", shuttle.shuttleStatus);
        
                        const msg = {payload: shuttle.shuttleStatus};
                        node.send(msg);
                    }
        
                });
        
                shuttleXpress.on("error", function(err) {
                    const msg = {payload: ""};
                    node.error(`ShuttleXpress Device Error: ${err}`, msg);
                });

                node.status({
                    fill: "green",
                    shape: "dot",
                    text: "connected"
                });

            } catch (err) {

                node.error(err);

                node.status({
                    fill: "red",
                    shape: "ring",
                    text: "disconnected"
                });

            }

            node.on("close", function() {
                shuttleXpress.close();
            });

        });

        usbDetect.on(`remove:${VID}:${PID}`, function(device) {

            //console.log(`remove:${VID}:${PID}`, device);

            shuttleXpress.close();
            shuttleXpress = null;

            node.status({
                fill: "red",
                shape: "ring",
                text: "disconnected"
            });

        });

    }

    // Get ShuttleXpress Device Info
    function ShuttleXpressDeviceInfoNode(config) {

        RED.nodes.createNode(this, config);

        const node = this;

        node.on("input", function(msg, send, done) {
            
            // For backwards compatibility with Node-RED 0.x
            send = send || function() {node.send.apply(node,arguments);};

            const devices = HID.devices();

            const deviceInfo = devices.find( function(d) {
                const isShuttleXpress = (d.product === "ShuttleXpress");
                return isShuttleXpress;
            });

            msg.payload = deviceInfo;
            send(msg);

            // For backwards compatibility with Node-RED 0.x
            if (done) {
                done();
            }

        });

    }


    // Helper Functions
    function parseShuttleData(shuttleData, shuttlePrev) {

        let shuttleStatus = null;

        // Buffer Construct: <00 00 00 00 00>
        //                   <JOG INCREMENTS 00 BTN_1-BTN_4 BTN_5>

        //console.log("shuttleCurr:", shuttleData);
        //console.log("shuttlePrev:", shuttlePrev);

        // Shuttle JOG Dial State
        if (shuttleData[0] !== shuttlePrev[0]) {
            if (shuttleData[0] >= 0x00 && shuttleData[0] <= 0x07)  shuttleStatus = {cmd: "JOG", value: shuttleData[0]};
            if (shuttleData[0] >= 0xF9 && shuttleData[0] <= 0xFF)  shuttleStatus = {cmd: "JOG", value: -(0xFF - (shuttleData[0] - 1))};
        }

        // Shuttle INCREMENT Dial State
        if (shuttleData[1] !== shuttlePrev[1]) {
            if (shuttlePrev[1] === 0xFF && shuttleData[1] === 0x00) {
                shuttleStatus = {cmd: "INCREMENT", value: +1};
            } else if (shuttlePrev[1] === 0x00 && shuttleData[1] === 0xFF) {
                shuttleStatus = {cmd: "INCREMENT", value: -1};
            } else if (shuttleData[1] > shuttlePrev[1]) {
                shuttleStatus = {cmd: "INCREMENT", value: +1};
            } else {
                shuttleStatus = {cmd: "INCREMENT", value: -1};
            }
        }

        // Shuttle BTN_1 thru BTN_4 State
        if (shuttleData[3] !== shuttlePrev[3]) {

            if (shuttleData[3] === 0x10) shuttleStatus = {cmd: "BTN_1", value: true};
            if (shuttlePrev[3] === 0x10) shuttleStatus = {cmd: "BTN_1", value: false};

            if (shuttleData[3] === 0x20) shuttleStatus = {cmd: "BTN_2", value: true};
            if (shuttlePrev[3] === 0x20) shuttleStatus = {cmd: "BTN_2", value: false};

            if (shuttleData[3] === 0x40) shuttleStatus = {cmd: "BTN_3", value: true};
            if (shuttlePrev[3] === 0x40) shuttleStatus = {cmd: "BTN_3", value: false};

            if (shuttleData[3] === 0x80) shuttleStatus = {cmd: "BTN_4", value: true};
            if (shuttlePrev[3] === 0x80) shuttleStatus = {cmd: "BTN_4", value: false};

        }

        // Shuttle BTN_5 State
        if (shuttleData[4] !== shuttlePrev[4]) {
            if (shuttleData[4] === 0x01) shuttleStatus = {cmd: "BTN_5", value: true};
            if (shuttlePrev[4] === 0x01) shuttleStatus = {cmd: "BTN_5", value: false};
        }

        if (shuttleStatus === null) {
            return null;
        } else if (typeof shuttleStatus === "object") {
            if ("cmd" in shuttleStatus && "value" in shuttleStatus) {
                // Store Previous Shuttle State
                shuttlePrev = shuttleData;
                return {shuttleStatus: shuttleStatus, shuttlePrev: shuttlePrev};
            } else {
                return null;
            }
        } else {
            return null;
        }

    }


    // Register Nodes
    RED.nodes.registerType("ShuttleXpressConfig", ShuttleXpressConfigNode);
    RED.nodes.registerType("DeviceInfo", ShuttleXpressDeviceInfoNode);
    RED.nodes.registerType("ShuttleXpress", ShuttleXpressNode);

};