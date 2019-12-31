import { DeviceBase } from './DeviceBase';


import { BLE } from '@ionic-native/ble/ngx';


export abstract class BodyscaleDeviceBase extends DeviceBase {

  type = 'bodyscale';
  constructor(ble: BLE, id: string, name: string, extra?: object) {
    super(ble, id, name, extra);

  }



}
