import {DeviceBase} from './DeviceBase';

import {BLE} from '@ionic-native/ble/ngx';


export class BodyscaleDeviceBase extends DeviceBase {

	type: string = 'bodyscale';

	constructor(ble: BLE, id: string, name: string, extra?: object) {
		super(ble, id, name, extra);
	}
}
