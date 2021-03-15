module.exports = function(RED) {

    const HID = require("node-hid");

    function ShuttleXpressConfigNode(n) {
        RED.nodes.createNode(this, n);
        this.vid = n.vid;
        this.pid = n.pid;
    }

    function ShuttleXpressNode(config) {

        RED.nodes.createNode(this, config);

        this.connection = RED.nodes.getNode(config.connection);

        this.log("I am here!");

        if (this.connection) {
            
        } else {
            this.log("No Connection");
        }

        let device = null;

        let shuttlePrev = Buffer.alloc(5).toJSON().data;

        try {

            device = new HID.HID(Number(this.connection.vid), Number(this.connection.pid));

            this.status({
                fill: "green",
                shape: "dot",
                text: "connected"
            });

        } catch (err) {

            this.error(err);

            this.status({
                fill: "red",
                shape: "ring",
                text: "disconnected"
            });

        }

        const node = this;

        device.on("data", function(data) {

            const shuttleData = parseShuttleData(data, shuttlePrev);
            shuttlePrev = shuttleData.shuttlePrev;
            const shuttleStatus = shuttleData.shuttleStatus;

            const msg = {payload: shuttleStatus};
            node.send(msg);

        });

        device.on("error", function(err) {
            const msg = {payload: ""};
            node.error(`ShuttleXpress Device Error: ${err}`, msg);
        });

        this.on("close", function() {
            device.close();
        });

    }

    // Get ShuttleXpress Device Info
    function ShuttleXpressDeviceInfoNode(config) {

        RED.nodes.createNode(this, config);

        const node = this;

        this.on("input", function(msg, send, done) {
            
            // For backwards compatibility with Node-RED 0.x
            send = send || function() {node.send.apply(node,arguments);};

            const devices = HID.devices();

            const deviceInfo = devices.find( function(d) {
                var isShuttleXpress = d.product==="ShuttleXpress";
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
    function parseShuttleData(buffer, shuttlePrev) {

        const shuttle = buffer.toJSON().data;

        if (shuttle[0] !== shuttlePrev[0]) {

            //console.log(`shuttle[0]: ${shuttle[0]}, shuttlePrev[0]: ${shuttlePrev[0]}`);

            if (shuttle[0] >= 0 && shuttle[0] <= 7)  shuttleStatus = {cmd: "JOG", value: shuttle[0]};
            if (shuttle[0] >= 249 && shuttle[0] <= 255)  shuttleStatus = {cmd: "JOG", value: (255 - (shuttle[0] - 1)) * -1};

            shuttlePrev[0] = shuttle[0]; // Store Previous Jog State
            shuttlePrev[1] = shuttle[1]; // Read & Store Current Increment State

        } else if (shuttle[3] !== shuttlePrev[3]) {

            //console.log(`shuttle[3]: ${shuttle[3]}, shuttlePrev[3]: ${shuttlePrev[3]}`);

            if (shuttle[3] === 16) shuttleStatus = {cmd: "BTN_1", value: true};
            if (shuttlePrev[3] === 16) shuttleStatus = {cmd: "BTN_1", value: false};

            if (shuttle[3] === 32) shuttleStatus = {cmd: "BTN_2", value: true};
            if (shuttlePrev[3] === 32) shuttleStatus = {cmd: "BTN_2", value: false};

            if (shuttle[3] === 64) shuttleStatus = {cmd: "BTN_3", value: true};
            if (shuttlePrev[3] === 64) shuttleStatus = {cmd: "BTN_3", value: false};

            if (shuttle[3] === 128) shuttleStatus = {cmd: "BTN_4", value: true};
            if (shuttlePrev[3] === 128) shuttleStatus = {cmd: "BTN_4", value: false};

            shuttlePrev[3] = shuttle[3]; // Store Previous State
            shuttlePrev[1] = shuttle[1]; // Read & Store Current Increment State

        } else if (shuttle[4] !== shuttlePrev[4]) {

            //console.log(`shuttle[4]: ${shuttle[4]}, shuttlePrev[4]: ${shuttlePrev[4]}`);

            if (shuttle[4] === 1) shuttleStatus = {cmd: "BTN_5", value: true};
            if (shuttlePrev[4] === 1) shuttleStatus = {cmd: "BTN_5", value: false};

            shuttlePrev[4] = shuttle[4]; // Store Previous Btn State
            shuttlePrev[1] = shuttle[1]; // Read & Store Current Increment State

        } else {

            if (shuttle[1] !== shuttlePrev[1]) {

                if (shuttlePrev[1] === 255 && shuttle[1] === 0) {
                    shuttleStatus = {cmd: "INCREMENT", value: +1};
                } else if (shuttlePrev[1] === 0 && shuttle[1] === 255) {
                    shuttleStatus = {cmd: "INCREMENT", value: -1};
                } else if (shuttle[1] > shuttlePrev[1]) {
                    shuttleStatus = {cmd: "INCREMENT", value: +1};
                } else {
                    shuttleStatus = {cmd: "INCREMENT", value: -1};
                }

                shuttlePrev[1] = shuttle[1]; // Store Previous Increement State

            }

        }

        //console.log(`INPUT: ${shuttleStatus.input}, VALUE: ${shuttleStatus.value}`);
        return {shuttleStatus: shuttleStatus, shuttlePrev: shuttlePrev};
        
    }


    // Register Nodes
    RED.nodes.registerType("ShuttleXpressConfig", ShuttleXpressConfigNode);
    RED.nodes.registerType("DeviceInfo", ShuttleXpressDeviceInfoNode);
    RED.nodes.registerType("ShuttleXpress", ShuttleXpressNode);

};