import {Injectable} from '@angular/core';
import {BLE} from '@ionic-native/ble/ngx';

import {Observable, Subject} from 'rxjs';
import {BloodpressureMeasurement, BodyscaleMeasurement} from 'autochek-base/objects/device-data-object';

/**
 * 혈압계 서비스 클래스
 */
@Injectable()
export class CordovaBpmeterService {

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
	private emitSyncData: Subject<BloodpressureMeasurement[]> = new Subject<BloodpressureMeasurement[]>();
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
	onSyncData: Observable<BloodpressureMeasurement[]> = this.emitSyncData.asObservable();
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
	putSyncData(measurements: BloodpressureMeasurement | BloodpressureMeasurement[]) {

		if (!Array.isArray(measurements)) {
			measurements = [measurements];
		}

		this.emitSyncData.next(measurements);
	}
}
