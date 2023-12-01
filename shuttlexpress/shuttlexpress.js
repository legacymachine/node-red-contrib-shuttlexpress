module.exports = function(RED) {

    const shuttle = require("shuttle-control-usb");

    function ShuttleXpressNode(config) {

        RED.nodes.createNode(this, config);

        const node = this;

        // vendorID for Contour Design Shuttle Devices (ShuttlePro v1, ShuttleXpress, ShuttlePro v2)
        //const VID = 0x0b33; // 2867

        // productID for ShuttlePro v1
        //const PID = 0x0010; // 16

        // productID for ShuttleXpress
        //const PID = 0x0020; // 32

        // productID for huttlePro v2
        //const PID = 0x0030; // 48

        let ShuttleID = null;
        let ShuttleName = "";

        // Shuttle 'connected' event
        shuttle.on("connected", (device) => {

            //const devices = shuttle.getDeviceList();
            //node.log(JSON.stringify(devices));

            // Assign first ID & Name to prevent multiple connections to one device
            if (!ShuttleID) ShuttleID = device.id;
            if (!ShuttleName) ShuttleName = device.name;

            if (device.id === ShuttleID) {
                node.log(`${ShuttleName} device [${device.id}] connected to Node-RED`);
                node.status({
                    fill: "green",
                    shape: "dot",
                    text: `connected: ${ShuttleName}`
                });
            }

        });

        // Shuttle 'disconnected' event
        shuttle.on("disconnected", (id) => {
            node.log(`${ShuttleName} device [${id}] disconnected from Node-RED`);
            node.status({
                fill: "red",
                shape: "dot",
                text: "disconnected"
            });
            ShuttleID = null;
            ShuttleName = "";
        });

        // Shuttle JOG (shuttle dial)
        shuttle.on("shuttle", (value, id) => {
            if (id === ShuttleID) {
                node.log(`${ShuttleName} [JOG: ${value}]`);
                const msg = {
                    payload: {
                        id: id,
                        cmd: "JOG",
                        value: value
                    }
                };
                node.send(msg);
            }
        });

        // Shuttle JOG-TRANSITION (shuttle dial previous)
        shuttle.on("shuttle-trans", (previous, current, id) => {
            if (id === ShuttleID) {
                node.log(`${ShuttleName} [JOG-TRANSITION: ${current}, ${previous}]`);
                const msg = {
                    payload: {
                        id: id,
                        cmd: "JOG-TRANSITION",
                        value: {
                            current: current,
                            previous: previous
                        }
                    }
                };
                node.send(msg);
            }
        });

        // Shuttle MPG (incremental dial direction)
        shuttle.on("jog-dir", (value, id) => {
            if (id === ShuttleID) {
                node.log(`${ShuttleName} [MPG: ${value}]`);
                const msg = {
                    payload: {
                        id: id,
                        cmd: "MPG",
                        value: value
                    }
                };
                node.send(msg);
            }
        });

        // Shuttle MPG-POSITION (incremental dial position)
        shuttle.on("jog", (value, id) => {
            if (id === ShuttleID) {
                node.log(`${ShuttleName} [MPG-POSITION: ${value}]`);
                const msg = {
                    payload: {
                        id: id,
                        cmd: "MPG-POSITION",
                        value: value
                    }
                };
                node.send(msg);
            }
        });

        // Shuttle BTN DOWN (button #)
        shuttle.on("buttondown", (value, id) => {
            if (id === ShuttleID) {
                node.log(`${ShuttleName} [BTN_${value}: true]`);
                const msg = {
                    payload: {
                        id: id,
                        cmd: `BTN_${value}`,
                        value: true
                    }
                };
                node.send(msg);
            }
        });

        // Shuttle BTN UP (button #)
        shuttle.on("buttonup", (value, id) => {
            if (id === ShuttleID) {
                node.log(`${ShuttleName} [BTN_${value}: false]`);
                const msg = {
                    payload: {
                        id: id,
                        cmd: `BTN_${value}`,
                        value: false
                    }
                };
                node.send(msg);
            }
        });

        // Stop Shuttle device on node close
        node.on("close", () => {
            try {
               node.log(`Stop ${ShuttleName} device`);
               shuttle.stop();
            } catch(err) {
               node.error(err);
               shuttle.stop();
            }
        });

        // Start Shuttle Device
        shuttle.start();

    }

    // Register Nodes
    RED.nodes.registerType("ShuttleXpress", ShuttleXpressNode);

};