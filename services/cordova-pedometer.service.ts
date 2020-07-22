import {Injectable} from '@angular/core';
import {BLE} from '@ionic-native/ble/ngx';

import {Observable, Subject} from 'rxjs';
import {
	GlucosemeterMeasurement,
	PedometerDaySummary,
	PedometerHeartrateSegment, PedometerMeasurement,
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

	/**
	 * 장치 연결 시작 Subject
	 */
	private emitBeginConnect: Subject<void> = new Subject<void>();
	/**
	 * 장치 연결 종료 Subject
	 */
	private emitEndConnect: Subject<void> = new Subject<void>();
	/**
	 * 데이터 동기화 시작 Subject
	 */
	private emitBeginSyncData: Subject<void> = new Subject<void>();
	/**
	 * 데이터 동기화 Subject
	 */
	private emitSyncData: Subject<PedometerMeasurement[]> = new Subject<PedometerMeasurement[]>();
	/**
	 * 데이터 동기화 종료 Subject
	 */
	private emitEndSyncData: Subject<void> = new Subject<void>();
	/**
	 * 장치 연결 시작 Observable
	 */
	onBeginConnect: Observable<void> = this.emitBeginConnect.asObservable();
	/**
	 * 장치 연결 종료 Observable
	 */
	onEndConnect: Observable<void> = this.emitEndConnect.asObservable();
	/**
	 * 데이터 동기화 시작 Observable
	 */
	onBeginSyncData: Observable<void> = this.emitBeginSyncData.asObservable();
	/**
	 * 데이터 동기화 Observable
	 */
	onSyncData: Observable<PedometerMeasurement[]> = this.emitSyncData.asObservable();
	/**
	 * 데이터 동기화 종료 Observable
	 */
	onEndSyncData: Observable<void> = this.emitEndSyncData.asObservable();

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
	 * 연결 시작
	 */
	beginConnect() {
		this.emitBeginConnect.next();
	}

	/**
	 * 연결 종료
	 */
	endConnect() {
		this.emitEndConnect.next();
	}

	/**
	 * 측정 시작
	 */
	beginSyncData() {
		this.emitBeginSyncData.next();
	}

	/**
	 * 측정 종료
	 */
	endSyncData() {
		this.emitEndSyncData.next();
	}

	/**
	 * 측정 데이터 전달
	 * @param measurements 측정 데이터
	 */
	public putSyncData(measurements: PedometerMeasurement | PedometerMeasurement[]) {
		if (!Array.isArray(measurements)) {
			measurements = [measurements];
		}
		this.emitSyncData.next(measurements);
	}

}
