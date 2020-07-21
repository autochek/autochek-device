import {Injectable} from '@angular/core';
import {BLE} from '@ionic-native/ble/ngx';

import {Observable, Subject} from 'rxjs';
import {
	PedometerDaySummary,
	PedometerHeartrateSegment,
	PedometerSleepSegment,
	PedometerSleepSummary,
	PedometerTimeSegment
} from 'autochek-base/objects/device-data-object';


export interface PedometerUser {
	gender: 'male' | 'female',
	age: number,
	birth: Date,
	height: number,
	weight: number,
}

export const DefaultPedometerUser: PedometerUser = {
	gender: 'male',
	age: 40,
	birth: new Date(1980, 0, 1),
	height: 175,
	weight: 65
}

/**
 * 스마트 밴드 서비스 클래스
 */
@Injectable()
export class CordovaPedometerService {

	private emitLogToServer: Subject<string> = new Subject<string>();
	private emitBeginPedometerMeasurements: Subject<void> = new Subject<void>();
	private emitPedometerTimeSegment: Subject<PedometerTimeSegment[]> = new Subject<PedometerTimeSegment[]>();
	private emitPedometerDaySummary: Subject<PedometerDaySummary[]> = new Subject<PedometerDaySummary[]>();
	private emitPedometerSleepSegment: Subject<PedometerSleepSegment[]> = new Subject<PedometerSleepSegment[]>();
	private emitPedometerHeartrateSegment: Subject<PedometerHeartrateSegment[]> = new Subject<PedometerHeartrateSegment[]>();
	private emitPedometerSleepSummary: Subject<PedometerSleepSummary[]> = new Subject<PedometerSleepSummary[]>();
	private emitSyncDataPostCallback: Subject<void> = new Subject<void>();
	private emitEndPedometerMeasurements: Subject<void> = new Subject<void>();

	onLogToServer: Observable<string> = this.emitLogToServer.asObservable();
	onBeginPedometerMeasurements: Observable<void> = this.emitBeginPedometerMeasurements.asObservable();
	onPedometerTimeSegment: Observable<PedometerTimeSegment[]> = this.emitPedometerTimeSegment.asObservable();
	onPedometerDaySummary: Observable<PedometerDaySummary[]> = this.emitPedometerDaySummary.asObservable();
	onPedometerSleepSegment: Observable<PedometerSleepSegment[]> = this.emitPedometerSleepSegment.asObservable();
	onPedometerHeartrateSegment: Observable<PedometerHeartrateSegment[]> = this.emitPedometerHeartrateSegment.asObservable();
	onPedometerSleepSummary: Observable<PedometerSleepSummary[]> = this.emitPedometerSleepSummary.asObservable();
	onSyncDataPostCallback: Observable<void> = this.emitSyncDataPostCallback.asObservable();
	onEndPedometerMeasurements: Observable<void> = this.emitEndPedometerMeasurements.asObservable();

	/**
	 * 생성자
	 * @param ble BLE 객체
	 */
	constructor(
		public ble: BLE,
	) {

	}

	user: PedometerUser = null;

	setUser(scaleUser: PedometerUser) {
		this.user = scaleUser;
	}

	getUser(): PedometerUser {
		if (this.user) {
			return this.user;
		}
		return DefaultPedometerUser;
	}

	private arraytize(data: any | any[]): any[] {
		if (!Array.isArray(data)) {
			data = [data];
		}
		return data;
	}

	/**
	 * 측정 시작
	 */
	beginPedometerMeasurements() {
		this.emitBeginPedometerMeasurements.next();
	}

	/**
	 * 측정 종료
	 */
	endPedometerMeasurements() {
		this.emitEndPedometerMeasurements.next();
	}

	public putLogToServer(log: string) {
		this.emitLogToServer.next(log);
	}

	public putPedometerTimeSegments(data: PedometerTimeSegment | PedometerTimeSegment[]) {
		this.emitPedometerTimeSegment.next(this.arraytize(data));
	}

	public putPedometerDaySummary(data: PedometerDaySummary | PedometerDaySummary[]) {
		this.emitPedometerDaySummary.next(this.arraytize(data));
	}

	public putPedometerSleepSegment(data: PedometerSleepSegment | PedometerSleepSegment[]) {
		this.emitPedometerSleepSegment.next(this.arraytize(data));
	}

	public putPedometerHeartrateSegment(data: PedometerHeartrateSegment | PedometerHeartrateSegment[]) {
		this.emitPedometerHeartrateSegment.next(this.arraytize(data));
	}

	public putPedometerSleepSummary(data: PedometerSleepSummary | PedometerSleepSummary[]) {
		this.emitPedometerSleepSummary.next(this.arraytize(data));
	}

	public putSyncDataPostCallback() {
		this.emitSyncDataPostCallback.next();
	}
}
