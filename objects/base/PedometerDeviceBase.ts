import {DeviceBase} from './DeviceBase';

import {BLE} from '@ionic-native/ble/ngx';


export abstract class PedometerDeviceBase extends DeviceBase {

	type: string = 'pedometer'

	constructor(ble: BLE, id: string, name: string, extra?: object) {
		super(ble, id, name, extra);
	}
}
