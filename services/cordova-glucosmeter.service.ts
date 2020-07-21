import {Injectable} from '@angular/core';
import {BLE} from '@ionic-native/ble/ngx';
import {GlucosemeterMeasurement} from 'autochek-base/objects/device-data-object';
import {Observable, Subject} from 'rxjs';

/**
 * 혈당계 서비스 클래스
 */
@Injectable()
export class CordovaGlucosemeterService {

	private emitBeginGlucosemeterMeasurements: Subject<void> = new Subject<void>();
	private emitGlucosemeterMeasurements: Subject<GlucosemeterMeasurement[]> = new Subject<GlucosemeterMeasurement[]>()
	private emitEndGlucosemeterMeasurements: Subject<void> = new Subject<void>();
	onBeginGlucosemeterMeasurements: Observable<void> = this.emitBeginGlucosemeterMeasurements.asObservable();
	onGlucosemeterMeasurements: Observable<GlucosemeterMeasurement[]> = this.emitGlucosemeterMeasurements.asObservable();
	onEndGlucosemeterMeasurements: Observable<void> = this.emitEndGlucosemeterMeasurements.asObservable();

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
	beginGlucosemeterMeasurements() {
		this.emitBeginGlucosemeterMeasurements.next();
	}

	/**
	 * 측정 종료
	 */
	endGlucosemeterMeasurements() {
		this.emitEndGlucosemeterMeasurements.next();
	}

	/**
	 * 측정 데이터 전달
	 * @param measurements 측정 데이터
	 */
	public putGlucosemeterMeasurements(measurements: GlucosemeterMeasurement | GlucosemeterMeasurement[]) {
		if (!Array.isArray(measurements)) {
			measurements = [measurements];
		}
		this.emitGlucosemeterMeasurements.next(measurements);
	}
}
