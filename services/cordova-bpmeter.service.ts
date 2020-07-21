import {Injectable} from '@angular/core';
import {BLE} from '@ionic-native/ble/ngx';

import {Observable, Subject} from 'rxjs';
import {BloodpressureMeasurement} from 'autochek-base/objects/device-data-object';

/**
 * 혈압계 서비스 클래스
 */
@Injectable()
export class CordovaBpmeterService {

	private emitBeginBloodpressureMeasurement: Subject<void> = new Subject<void>();
	private emitBloodpressureMeasurement: Subject<BloodpressureMeasurement[]> = new Subject<BloodpressureMeasurement[]>()
	private emitEndBloodpressureMeasurement: Subject<void> = new Subject<void>();
	onBeginBloodpressureMeasurement: Observable<void> = this.emitBeginBloodpressureMeasurement.asObservable();
	onBloodpressureMeasurement: Observable<BloodpressureMeasurement[]> = this.emitBloodpressureMeasurement.asObservable();
	onEndBloodpressureMeasurement: Observable<void> = this.emitEndBloodpressureMeasurement.asObservable();

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
		this.emitBeginBloodpressureMeasurement.next();
	}

	/**
	 * 측정 종료
	 */
	endBloodpressureMeasurement() {
		this.emitEndBloodpressureMeasurement.next();
	}

	/**
	 * 측정 데이터 전달
	 * @param measurements 측정 데이터
	 */
	putBloodpressureMeasurement(measurements: BloodpressureMeasurement | BloodpressureMeasurement[]) {

		if (!Array.isArray(measurements)) {
			measurements = [measurements];
		}

		this.emitBloodpressureMeasurement.next(measurements);
	}
}
