import { Injectable } from '@angular/core';
import { BLE } from '@ionic-native/ble/ngx';

import { Subject } from 'rxjs';
import { BodyscaleMeasurement } from 'autochek-base/objects/device-data-object';


export interface ScaleUser {
  gender:'male'|'female',
  age:number,
  birth:Date,
  height:number,
  
}

export const DefaultScaleUser: ScaleUser = {
  gender:'male',
  age:40,
  birth:new Date(1980,0,1),
  height:175,
  
}

@Injectable()
export class CordovaBodyscaleService {

  constructor(
    public ble: BLE,
  ) {

  }

  user:ScaleUser = null;
  setUser(scaleUser:ScaleUser){
    this.user = scaleUser;
  }
  getUser(): ScaleUser{
    if(this.user) {
      return this.user;
    }
    return DefaultScaleUser;
  }

  onBodyscaleMeasurment: Subject<BodyscaleMeasurement[]> = new Subject<BodyscaleMeasurement[]>();
  putBodyscaleMeasurement(measurements: BodyscaleMeasurement | BodyscaleMeasurement[]) {
    if (!Array.isArray(measurements)) {
      measurements = [measurements];
    }
    this.onBodyscaleMeasurment.next(measurements);
  }


}
