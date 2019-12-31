import { Injectable } from '@angular/core';
import { BLE } from '@ionic-native/ble/ngx';

import { Subject } from 'rxjs';
import { BodyscaleMeasurement } from 'autochek-base/objects/device-data-object';


@Injectable()
export class CordovaBodyscaleService {

  constructor(
    public ble: BLE,
  ) {

  }

  onBodyscaleMeasurment: Subject<BodyscaleMeasurement[]> = new Subject<BodyscaleMeasurement[]>();
  putBodyscaleMeasurement(measurements: BodyscaleMeasurement | BodyscaleMeasurement[]) {
    if (!Array.isArray(measurements)) {
      measurements = [measurements];
    }
    this.onBodyscaleMeasurment.next(measurements);
  }


}
