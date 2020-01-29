import { Injectable } from '@angular/core';
import { BLE } from '@ionic-native/ble/ngx';

import { Subject } from 'rxjs';
import { PedometerTimeSegment, PedometerDaySummary, PedometerSleepSegment,
   PedometerHeartrateSegment, PedometerSleepSummary } from 'autochek-base/objects/device-data-object';


export interface PedometerUser {
  gender:'male'|'female',
  age:number,
  birth:Date,
  height:number,
  weight:number,
}

export const DefaultPedometerUser: PedometerUser = {
  gender:'male',
  age:40,
  birth:new Date(1980,0,1),
  height:175,
  weight:65
}

  
@Injectable()
export class CordovaPedometerService {

  constructor(
    public ble: BLE,
  ) {

  }


  user:PedometerUser = null;
  setUser(scaleUser:PedometerUser){
    this.user = scaleUser;
  }
  getUser(): PedometerUser{
    if(this.user) {
      return this.user;
    }
    return DefaultPedometerUser;
  }

  onLogToServer: Subject<string> = new Subject<string>();
  onPedometerTimeSegment: Subject<PedometerTimeSegment[]> = new Subject<PedometerTimeSegment[]>();
  onPedometerDaySummary: Subject<PedometerDaySummary[]> = new Subject<PedometerDaySummary[]>();
  onPedometerSleepSegment: Subject<PedometerSleepSegment[]> = new Subject<PedometerSleepSegment[]>();
  onPedometerHeartrateSegment: Subject<PedometerHeartrateSegment[]> = new Subject<PedometerHeartrateSegment[]>();
  onPedometerSleepSummary: Subject<PedometerSleepSummary[]> = new Subject<PedometerSleepSummary[]>();
  onSyncDataPostCallback: Subject<void> = new Subject<void>();



  private arraytize(data: any | any[]): any[] {
    if (!Array.isArray(data)) {
      data = [data];
    }
    return data;
  }


  public putLogToServer(log: string) {
    this.onLogToServer.next(log);
  }

  public putPedometerTimeSegments(data: PedometerTimeSegment | PedometerTimeSegment[]) {
    this.onPedometerTimeSegment.next(this.arraytize(data));
  }

  public putPedometerDaySummary(data: PedometerDaySummary | PedometerDaySummary[]) {
    this.onPedometerDaySummary.next(this.arraytize(data));
  }

  public putPedometerSleepSegment(data: PedometerSleepSegment | PedometerSleepSegment[]) {
    this.onPedometerSleepSegment.next(this.arraytize(data));
  }
  public putPedometerHeartrateSegment(data: PedometerHeartrateSegment | PedometerHeartrateSegment[]) {
    this.onPedometerHeartrateSegment.next(this.arraytize(data));
  }
  public putPedometerSleepSummary(data: PedometerSleepSummary | PedometerSleepSummary[]) {
    this.onPedometerSleepSummary.next(this.arraytize(data));
  }
  public putSyncDataPostCallback() {
    this.onSyncDataPostCallback.next();
  }



}
