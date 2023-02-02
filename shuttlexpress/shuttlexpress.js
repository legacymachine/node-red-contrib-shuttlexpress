module.exports = function(RED) {

    const HID = require("node-hid");
    const usbDetect = require("usb-detection");

    function ShuttleXpressNode(config) {

        RED.nodes.createNode(this, config);

        const node = this;

        // vendorID and productID for Contour Design ShuttleXpress device
        const VID = 0x0b33; // 2867
        const PID = 0x0020; // 32

        // Start Monitoring USB devies for detection
        usbDetect.startMonitoring();

        usbDetect.on(`add:${VID}:${PID}`, function(device) {
            const connection = connectShuttleXpress(VID, PID, node);
            if (connection.connected) {
                node.log("ShuttleXpress device connected to Node-RED");
                node.status({
                    fill: "green",
                    shape: "dot",
                    text: "connected"
                });
            } else {
                node.log("ShuttleXpress device failed to connect to Node-RED");
                node.error(connection.err);
                node.status({
                    fill: "red",
                    shape: "ring",
                    text: "disconnected"
                });
            }
        });

        usbDetect.on(`remove:${VID}:${PID}`, function(device) {
            node.log("ShuttleXpress device disconnected from Node-RED");
            node.status({
                fill: "red",
                shape: "ring",
                text: "disconnected"
            });
        });

        usbDetect.find(VID, PID, function(err, devices) { 
            const device = devices.find(device => (device.vendorId === VID && device.productId === PID));
            if (device) {
                usbDetect.emit(`add:${VID}:${PID}`, device);
            } else {
                node.log("ShuttleXpress device not found");
                node.status({
                    fill: "red",
                    shape: "ring",
                    text: "disconnected"
                });
            }
        });

    }


    function connectShuttleXpress(VID, PID) {

        let connection = {
            connected: false,
            err: null
        };

        try {

            const shuttleXpress = new HID.HID(VID, PID, node);

            let dataPrevious = Buffer.alloc(5).toJSON().data;

            shuttleXpress.on("data", function(data) {

                // 'data' is a Buffer
                // Buffer Construct: <00 00 00 00 00>
                // <JOG MPG 00 BTN_1-BTN_4 BTN_5>

                const dataCurrent = data.toJSON().data;

                const shuttle = parseShuttleData(dataCurrent, dataPrevious);

                if (shuttle !== null) {

                    dataPrevious = shuttle.dataPrevious;

                    // add the raw buffer to the return object
                    shuttle.status.buffer = data;
                    //console.log("status:", shuttle.status);
    
                    const msg = {payload: shuttle.status};
                    node.send(msg);

                }
    
            });
    
            shuttleXpress.on("error", function(err) {
                const msg = {payload: "ShuttleXpress Device Error"};
                node.error(err, msg);
            });

            // update connected property to true
            connection.connected = true;

        } catch (err) {
            // update err property with error message
            connection.err = err;
        } finally {
            return connection;
        }

    };

    // Helper Functions
    function parseShuttleData(dataCurrent, dataPrevious) {

        let status = null;

        // Shuttle JOG Dial State
        if (dataCurrent[0] !== dataPrevious[0]) {
            if (dataCurrent[0] >= 0x00 && dataCurrent[0] <= 0x07) {
                status = {cmd: "JOG", value: dataCurrent[0]};
            } else if (dataCurrent[0] >= 0xF9 && dataCurrent[0] <= 0xFF) {
                status = {cmd: "JOG", value: -(0xFF - (dataCurrent[0] - 1))};
            } else {
                return null;
            }
        }

        // Shuttle MPG Dial State
        if (dataCurrent[1] !== dataPrevious[1]) {
            if (dataPrevious[1] === 0xFF && dataCurrent[1] === 0x00) {
                status = {cmd: "MPG", value: +1};
            } else if (dataPrevious[1] === 0x00 && dataCurrent[1] === 0xFF) {
                status = {cmd: "MPG", value: -1};
            } else if (dataCurrent[1] > dataPrevious[1]) {
                status = {cmd: "MPG", value: +1};
            } else {
                status = {cmd: "MPG", value: -1};
            }
        }

        // Shuttle BTN_1 thru BTN_4 State
        if (dataCurrent[3] !== dataPrevious[3]) {
            if (dataCurrent[3] === 0x10) {
                status = {cmd: "BTN_1", value: true};
            } else if (dataPrevious[3] === 0x10) {
                status = {cmd: "BTN_1", value: false};
            } else if (dataCurrent[3] === 0x20) {
                status = {cmd: "BTN_2", value: true};
            } else if (dataPrevious[3] === 0x20) {
                status = {cmd: "BTN_2", value: false};
            } else if (dataCurrent[3] === 0x40) {
                status = {cmd: "BTN_3", value: true};
            } else if (dataPrevious[3] === 0x40) {
                status = {cmd: "BTN_3", value: false};
            } else if (dataCurrent[3] === 0x80) {
                status = {cmd: "BTN_4", value: true};
            } else if (dataPrevious[3] === 0x80) {
                status = {cmd: "BTN_4", value: false};
            } else {
                return null;
            }
        }

        // Shuttle BTN_5 State
        if (dataCurrent[4] !== dataPrevious[4]) {
            if (dataCurrent[4] === 0x01) {
                status = {cmd: "BTN_5", value: true};
            } else if (dataPrevious[4] === 0x01) {
                status = {cmd: "BTN_5", value: false};
            } else {
                return null;
            }
        }

        if (status === null) {
            return null;
        } else if (typeof status === "object") {
            if ("cmd" in status && "value" in status) {
                // Store Previous Shuttle State
                dataPrevious = dataCurrent;
                return {status: status, dataPrevious: dataPrevious};
            } else {
                return null;
            }
        } else {
            return null;
        }

    };

    // Register Nodes
    RED.nodes.registerType("ShuttleXpress", ShuttleXpressNode);

};