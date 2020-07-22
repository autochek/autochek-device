import {Injectable} from '@angular/core';
import {BLE} from '@ionic-native/ble/ngx';
import {BloodpressureMeasurement, GlucosemeterMeasurement} from 'autochek-base/objects/device-data-object';
import {Observable, Subject} from 'rxjs';
import {DeviceBase} from "autochek-device/objects/base/DeviceBase";

/**
 * 혈당계 서비스 클래스
 */
@Injectable()
export class CordovaGlucosemeterService {

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
	private emitBeginSyncData: Subject<DeviceBase> = new Subject<DeviceBase>();
	/**
	 * 데이터 동기화 Subject
	 */
	private emitSyncData: Subject<GlucosemeterMeasurement[]> = new Subject<GlucosemeterMeasurement[]>();
	/**
	 * 데이터 동기화 종료 Subject
	 */
	private emitEndSyncData: Subject<DeviceBase> = new Subject<DeviceBase>();
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
	onBeginSyncData: Observable<DeviceBase> = this.emitBeginSyncData.asObservable();
	/**
	 * 데이터 동기화 Observable
	 */
	onSyncData: Observable<GlucosemeterMeasurement[]> = this.emitSyncData.asObservable();
	/**
	 * 데이터 동기화 종료 Observable
	 */
	onEndSyncData: Observable<DeviceBase> = this.emitEndSyncData.asObservable();

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
	 * @param device
	 */
	beginSyncData(device: DeviceBase) {
		this.emitBeginSyncData.next(device);
	}

	/**
	 * 측정 종료
	 * @param device
	 */
	endSyncData(device: DeviceBase) {
		this.emitEndSyncData.next(device);
	}

	/**
	 * 측정 데이터 전달
	 * @param measurements 측정 데이터
	 */
	public putSyncData(measurements: GlucosemeterMeasurement | GlucosemeterMeasurement[]) {
		if (!Array.isArray(measurements)) {
			measurements = [measurements];
		}
		this.emitSyncData.next(measurements);
	}
}
