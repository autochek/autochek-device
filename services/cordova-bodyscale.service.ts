import { Injectable } from '@angular/core'
import { BLE } from '@ionic-native/ble/ngx'

import { Subject } from 'rxjs'
import { BodyscaleMeasurement } from 'autochek-base/objects/device-data-object'


export interface ScaleUser {
  gender: 'male' | 'female',
  age: number,
  birth: Date,
  height: number,

}

export const DefaultScaleUser: ScaleUser = {
  gender: 'male',
  age: 40,
  birth: new Date(1980, 0, 1),
  height: 175,

}

/**
 * 체중계 서비스 클래스
 */
@Injectable()
export class CordovaBodyscaleService {
  onBeginBodyscaleMeasurment: Subject<void> = new Subject<void>();
  onBodyscaleMeasurment: Subject<BodyscaleMeasurement[]> = new Subject<BodyscaleMeasurement[]>();
  onEndBodyscaleMeasurment: Subject<void> = new Subject<void>();

  /**
   * 생성자
   * @param ble BLE 객체
   */
  constructor(
      public ble: BLE,
  ) {

  }

  user: ScaleUser = null;

  setUser(scaleUser: ScaleUser) {
    this.user = scaleUser;
  }

  getUser(): ScaleUser {
    if (this.user) {
      return this.user;
    }
    return DefaultScaleUser;
  }

  /**
   * 측정 시작
   */
  beginBodyscaleMeasurement() {
    this.onBeginBodyscaleMeasurment.next();
  }

  /**
   * 측정 종료
   */
  endBodyscaleMeasurement() {
    this.onEndBodyscaleMeasurment.next();
  }

  /**
   * 측정 데이터 전달
   * @param measurements 측정 데이터
   */
  putBodyscaleMeasurement(measurements: BodyscaleMeasurement | BodyscaleMeasurement[]) {
    if (!Array.isArray(measurements)) {
      measurements = [measurements];
    }
    this.onBodyscaleMeasurment.next(measurements);
  }
}
