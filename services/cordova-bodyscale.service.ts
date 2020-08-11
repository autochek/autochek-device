import {Injectable} from '@angular/core';
import {BLE} from '@ionic-native/ble/ngx';

import {Observable, Subject} from 'rxjs';
import {BodyscaleMeasurement} from 'autochek-base/objects/device-data-object';
import {DeviceBase} from "autochek-device/objects/base/DeviceBase";


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

	/**
	 * 측정 사용자 정보
	 */
	user: ScaleUser = null;
	/**
	 * 장치 연결 시작 Subject
	 */
	private emitBeginConnect: Subject<void> = new Subject<void>();
	/**
	 * 장치 연결 시작 Observable
	 */
	onBeginConnect: Observable<void> = this.emitBeginConnect.asObservable();
	/**
	 * 장치 연결 종료 Subject
	 */
	private emitEndConnect: Subject<void> = new Subject<void>();
	/**
	 * 장치 연결 종료 Observable
	 */
	onEndConnect: Observable<void> = this.emitEndConnect.asObservable();
	/**
	 * 데이터 동기화 시작 Subject
	 */
	private emitBeginSyncData: Subject<DeviceBase> = new Subject<DeviceBase>();
	/**
	 * 데이터 동기화 시작 Observable
	 */
	onBeginSyncData: Observable<DeviceBase> = this.emitBeginSyncData.asObservable();
	/**
	 * 데이터 동기화 Subject
	 */
	private emitSyncData: Subject<BodyscaleMeasurement[]> = new Subject<BodyscaleMeasurement[]>();
	/**
	 * 데이터 동기화 Observable
	 */
	onSyncData: Observable<BodyscaleMeasurement[]> = this.emitSyncData.asObservable();
	/**
	 * 데이터 동기화 종료 Subject
	 */
	private emitEndSyncData: Subject<DeviceBase> = new Subject<DeviceBase>();
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
	 * 측정 사용자 정보 설정
	 * @param scaleUser 측정 사용자 정보
	 */
	setUser(scaleUser: ScaleUser) {
		this.user = scaleUser;
	}

	/**
	 * 측정 사용자 정보를 반환한다.
	 */
	getUser(): ScaleUser {
		if (this.user) {
			return this.user;
		}
		return DefaultScaleUser;
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
	putSyncData(measurements: BodyscaleMeasurement | BodyscaleMeasurement[]) {
		if (!Array.isArray(measurements)) {
			measurements = [measurements];
		}
		this.emitSyncData.next(measurements);
	}
}
