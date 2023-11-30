module.exports = function(RED) {

    const shuttleXpress = require("shuttle-control-usb");

    function ShuttleXpressNode(config) {

        RED.nodes.createNode(this, config);

        const node = this;

        // vendorID and productID for Contour Design ShuttleXpress device
        //const VID = 0x0b33; // 2867
        //const PID = 0x0020; // 32

        let ShuttleXpressID = null;

        // ShuttleXpress 'connected' event
        shuttleXpress.on("connected", (device) => {
            //const devices = shuttleXpress.getDeviceList();
            //node.log(JSON.stringify(devices));
            if (device.name === "ShuttleXpress") {
                if (!ShuttleXpressID) ShuttleXpressID = device.id;
                if (device.id === ShuttleXpressID) {
                    node.log(`ShuttleXpress device [${device.id}] connected to Node-RED`);
                node.status({
                    fill: "green",
                    shape: "dot",
                    text: "connected"
                });
                }
            }
        });

        // ShuttleXpress 'disconnected' event
        shuttleXpress.on("disconnected", (id) => {
            node.log(`ShuttleXpress device [${id}] disconnected from Node-RED`);
            node.status({
                fill: "red",
                shape: "dot",
                text: "disconnected"
            });
            ShuttleXpressID = null;
        });

        // ShuttleXpress JOG (shuttle dial)
        shuttleXpress.on("shuttle", (value, id) => {
            if (id === ShuttleXpressID) {
                node.log(`ShuttleXpress [JOG: ${value}]`);
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

        // ShuttleXpress MPG (incremental dial)
        shuttleXpress.on("jog-dir", (value, id) => {
            if (id === ShuttleXpressID) {
                node.log(`ShuttleXpress [MPG: ${value}]`);
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

        // ShuttleXpress BTN DOWN (button #)
        shuttleXpress.on("buttondown", (value, id) => {
            if (id === ShuttleXpressID) {
                node.log(`ShuttleXpress [BTN_${value}: true]`);
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

        // ShuttleXpress BTN UP (button #)
        shuttleXpress.on("buttonup", (value, id) => {
            if (id === ShuttleXpressID) {
                node.log(`ShuttleXpress [BTN_${value}: false]`);
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

        // Stop ShuttleExpress device on node close
        node.on("close", () => {
            try {
               node.log('Stop ShuttleXpress device');
               shuttleXpress.stop();
            } catch(err) {
               node.error(err);
               shuttleXpress.stop();
            }
        });

        // Start ShuttleXpress Device
        shuttleXpress.start();

    }

    // Register Nodes
    RED.nodes.registerType("ShuttleXpress", ShuttleXpressNode);

};