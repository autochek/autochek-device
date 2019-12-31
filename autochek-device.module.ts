import { NgModule } from '@angular/core';
import { DeviceInfoProvider } from './services/device-info';

import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { BLE } from '@ionic-native/ble/ngx';
import { File } from '@ionic-native/file/ngx';
import { CordovaGlucosemeterService } from './services/cordova-glucosmeter.service';
import { CordovaPedometerService } from './services/cordova-pedometer.service';
import { CordovaBpmeterService } from './services/cordova-bpmeter.service';
import { CordovaBodyscaleService } from './services/cordova-bodyscale.service';

@NgModule({
  imports: [],
  declarations: [],
  exports: [],
  providers: [
    // External modules
    NativeStorage,
    BLE,
    File,


    // Internal services
    DeviceInfoProvider,
    CordovaGlucosemeterService,
    CordovaPedometerService,
    CordovaBpmeterService,
    CordovaBodyscaleService,


  ],
})
export class AutochekDeviceModule { }

/*

ionic cordova plugin add cordova-plugin-nativestorage
ionic cordova plugin add cordova-plugin-ble-central
npm install --save @ionic-native/native-storage
npm install --save @ionic-native/ble

*/

