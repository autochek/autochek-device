import { DeviceBase } from './DeviceBase';


import { BLE } from '@ionic-native/ble/ngx';


export abstract class BloodpressureDeviceBase extends DeviceBase {

  type = 'bpmeter';
  constructor(ble: BLE, id: string, name: string, extra?: object) {
    super(ble, id, name, extra);

  }



}
