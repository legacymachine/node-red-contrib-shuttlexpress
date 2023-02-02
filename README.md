# node-red-contrib-shuttlexpress

Node-RED node for Contour Design's USB ShuttleXpress input device, built around [node-hid](https://github.com/node-hid/node-hid) and [usb-detection](https://github.com/MadLittleMods/node-usb-detection).

This node was created as a physical control option for a [Grbl](https://www.grbl.org/) based CNC controlled machine but can be used generically for other user defined needs.

## Install

Either use the Editor -> Menu -> Manage Palette -> Install option, or run the following command in your Node-RED user directory (typically ~/.node-red).

```
npm install @legacymachine/node-red-contrib-shuttlexpress
```

## Prerequisites

[ShuttleXpress](https://contourdesign.com/products/shuttle-xpress) device by Contour Design

## Usage

This node parses the output buffer data from a Contour Design ShuttleXpress device. The parsed buffer data is output to `msg.payload` as an object containing `cmd`, `value` and `buffer` properties. The `buffer` property is the raw buffer from the ShuttleXpress device that can be easily parsed using the [node-red-contrib-buffer-parser](https://flows.nodered.org/node/node-red-contrib-buffer-parser) node. If a device error occurs, it will be handled using node.error().

### Output

&nbsp;&nbsp;&nbsp;&nbsp;payload `object`

```
{cmd: BTN_#, value: boolean, buffer: <00 00 00 20 01>}

{cmd: MPG, value: -1 or 1, buffer: <00 FF 00 00 00>}

{cmd: JOG, value: -7 to 7, buffer: <FF 00 00 00 00>}
```

### Output Details

`BTN_#` - returns true for button pressed, false for button released.

`MPG` - returns either -1 or +1 to reflect CCW (negative) or CW (positive) direction of the MPG (Manual Pulse Generator) dial.

`JOG` - returns integer values between -7 and 7 where 0 is the resting state of the jog dial, negative values are CCW and positive values are CW on the jog dial.

## Linux Notes

Visit the [node-hid](https://github.com/node-hid/node-hid#readme) repository on GitHub for information on setup, and the prerequisites for various platforms (especially Linux) to get the node installed and working.

### udev device permissions

Most Linux distros use `udev` to manage access to physical devices, and USB HID devices are normally owned by the `root` user. To allow non-root access, you must create a udev rule for the device, based on the devices vendorId and productId.

This rule is a text file placed in `/etc/udev/rules.d`.

For this ShuttleXpress USB HID device with `vendorId = 0x0b33` and `productId = 0x0020`, the rules file to support both hidraw and libusb would look like:

```bash
SUBSYSTEM=="input", GROUP="input", MODE="0666"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0b33", ATTRS{idProduct}=="0020", MODE:="666", GROUP="plugdev"
KERNEL=="hidraw*", ATTRS{idVendor}=="0b33", ATTRS{idProduct}=="0020", MODE="0666", GROUP="plugdev"
```

Note that the values for vendorId and productId must be in hex and lower-case.

Save this file as `/etc/udev/rules.d/ShuttleXpress.rules`, unplug the HID device, and reload the rules with:

```bash
sudo udevadm control --reload-rules
```
