import { Injectable } from '@angular/core'
import { BLE } from '@ionic-native/ble/ngx'

import { Subject } from 'rxjs'
import { BloodpressureMeasurement } from 'autochek-base/objects/device-data-object'


@Injectable()
export class CordovaBpmeterService {

  onBeginBloodpressureMeasurement: Subject<void> = new Subject<void>();
  onBloodpressureMeasurement: Subject<BloodpressureMeasurement[]> = new Subject<BloodpressureMeasurement[]>()
  onEndBloodpressureMeasurement: Subject<void> = new Subject<void>();

  /**
   * 생성자
   * @param ble BLE 객체
   */
  constructor(
      public ble: BLE,
  ) {
  }

  /**
   * 측정 시작
   */
  beginBloodpressureMeasurement() {
    this.onBeginBloodpressureMeasurement.next();
  }

  /**
   * 측정 종료
   */
  endBloodpressureMeasurement() {
    this.onEndBloodpressureMeasurement.next();
  }

  /**
   * 측정 데이터 전달
   * @param measurements 측정 데이터
   */
  putBloodpressureMeasurement(measurements: BloodpressureMeasurement | BloodpressureMeasurement[]) {

    if (!Array.isArray(measurements)) {
      measurements = [measurements]
    }

    this.onBloodpressureMeasurement.next(measurements)
  }
}
