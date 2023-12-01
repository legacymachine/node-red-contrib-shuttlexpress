# node-red-contrib-shuttlexpress

Node-RED node for Contour Design's USB ShuttleXpress input device, built around [shuttle-control-usb](https://github.com/hopejr/ShuttleControlUSB) which uses [node-hid](https://github.com/node-hid/node-hid) and [usb](https://github.com/node-usb/node-usb).

Note: Contour Design's ShuttlePro v1 and ShuttlePro v2 should work as well.

This node was created as a physical control option for a [Grbl](https://www.grbl.org/) based CNC controlled machine but can be used generically for other user defined needs.

## Install

Either use the Editor -> Menu -> Manage Palette -> Install option, or run the following command in your Node-RED user directory (typically ~/.node-red).

```bash
npm install @legacymachine/node-red-contrib-shuttlexpress
```

## Prerequisites

[ShuttleXpress](https://contourdesign.com/products/shuttle-xpress) device by Contour Design

## Usage

This node parses the output buffer data from a Contour Design ShuttleXpress device. The parsed buffer data is output to `msg.payload` as an object containing `cmd`, `value` and `id` properties. If a device error occurs, it will be handled using node.error().

### Output

&nbsp;&nbsp;&nbsp;&nbsp;payload `object`

```javascript
{cmd: BTN_#, value: boolean, id: device.id}

{cmd: MPG, value: -1 or 1, id: device.id}

{cmd: MPG-POSITION, value: 0 to 255, id: device.id}

{cmd: JOG, value: -7 to 7, id: device.id}

{cmd: JOG-TRANSITION, value: {current: -7 to 7, previous: -7 to 7}, id: device.id}
```

### Output Details

`BTN_#` - returns true for button pressed, false for button released.

`MPG` - returns either -1 or +1 to reflect CCW (negative) or CW (positive) direction of the MPG (Manual Pulse Generator) dial.

`JOG` - returns integer values between -7 and 7 where 0 is the resting state of the jog dial, negative values are CCW and positive values are CW on the jog dial.

## Linux Notes

### Install the packages as shown below

```bash
sudo apt install build-essential libudev-dev
```

Visit the [node-hid](https://github.com/node-hid/node-hid#readme) and [usb](https://github.com/node-usb/node-usb#readme) repositories on GitHub for information on setup, and the prerequisites for various platforms (especially Linux) to get the node installed and working.

### udev device permissions

Most Linux distros use `udev` to manage access to physical devices, and USB HID devices are normally owned by the `root` user. To allow non-root access, you must create a udev rule for the device, based on the devices vendorId and productId.

This rule is a text file placed in `/etc/udev/rules.d`.

For these Shuttle USB HID devices with `vendorId = 0x0b33` and `productIds = 0x0010, 0x0020, 0x0030`, the rules file to support hidraw would look like:

```bash
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="0b33", ATTRS{idProduct}=="0010", MODE="0666"

SUBSYSTEM=="hidraw", ATTRS{idVendor}=="0b33", ATTRS{idProduct}=="0020", MODE="0666"

SUBSYSTEM=="hidraw", ATTRS{idVendor}=="0b33", ATTRS{idProduct}=="0030", MODE="0666"
```

Note that the values for vendorId and productId must be in hex and lower-case.

Save this file as `/etc/udev/rules.d/99-Shuttle.rules`, unplug the HID device, and reload the rules with:

**Note: `99-Shuttle.rules` File is included in GitHub repository

```bash
sudo udevadm control --reload-rules
```
