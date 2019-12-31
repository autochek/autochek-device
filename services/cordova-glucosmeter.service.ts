import { Injectable } from '@angular/core';
import { BLE } from '@ionic-native/ble/ngx';
import { GlucosemeterMeasurement } from 'autochek-base/objects/device-data-object';
import { Subject } from 'rxjs';


@Injectable()
export class CordovaGlucosemeterService {

  constructor(
    public ble: BLE,
  ) {

  }

  public onGlucosemeterMeasurements: Subject<GlucosemeterMeasurement[]> = new Subject<GlucosemeterMeasurement[]>();


  public putGlucosemeterMeasurements(measurements: GlucosemeterMeasurement | GlucosemeterMeasurement[]) {
    if (!Array.isArray(measurements)) {
      measurements = [measurements];
    }
    this.onGlucosemeterMeasurements.next(measurements);
  }
}
