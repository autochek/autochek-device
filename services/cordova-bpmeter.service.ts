import { Injectable } from '@angular/core';
import { BLE } from '@ionic-native/ble/ngx';

import { Subject } from 'rxjs';
import { BloodpressureMeasurement } from 'autochek-base/objects/device-data-object';


@Injectable()
export class CordovaBpmeterService {

  constructor(
    public ble: BLE,
  ) {

  }

  onBloodpressureMeasurement: Subject<BloodpressureMeasurement[]> = new Subject<BloodpressureMeasurement[]>();

  putBloodpressureMeasurement(measurements: BloodpressureMeasurement | BloodpressureMeasurement[]) {

    if (!Array.isArray(measurements)) {
      measurements = [measurements];
    }

    this.onBloodpressureMeasurement.next(measurements);
  }

}
