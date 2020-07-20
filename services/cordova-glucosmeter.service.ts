import {Injectable} from '@angular/core';
import {BLE} from '@ionic-native/ble/ngx';
import {GlucosemeterMeasurement} from 'autochek-base/objects/device-data-object';
import {Subject} from 'rxjs';

/**
 * 혈당계 서비스 클래스
 */
@Injectable()
export class CordovaGlucosemeterService {

	onBeginGlucosemeterMeasurements: Subject<void> = new Subject<void>();
	onGlucosemeterMeasurements: Subject<GlucosemeterMeasurement[]> = new Subject<GlucosemeterMeasurement[]>()
	onEndGlucosemeterMeasurements: Subject<void> = new Subject<void>();

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
		this.onBeginGlucosemeterMeasurements.next();
	}

	/**
	 * 측정 종료
	 */
	endGlucosemeterMeasurements() {
		this.onEndGlucosemeterMeasurements.next();
	}

	/**
	 * 측정 데이터 전달
	 * @param measurements 측정 데이터
	 */
	public putGlucosemeterMeasurements(measurements: GlucosemeterMeasurement | GlucosemeterMeasurement[]) {
		if (!Array.isArray(measurements)) {
			measurements = [measurements];
		}
		this.onGlucosemeterMeasurements.next(measurements);
	}
}
