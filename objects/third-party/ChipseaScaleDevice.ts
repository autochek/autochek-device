import {Buffer} from 'buffer';

import {CordovaBodyscaleService} from 'autochek-device/services/cordova-bodyscale.service';
import {BodyscaleDeviceBase} from '../base/BodyscaleDeviceBase';
import {BodyscaleMeasurement} from 'autochek-base/objects/device-data-object';
import {Observable, Subject} from "rxjs";


const UUID_SERVICE = 'fff0';
const UUID_CHAR_NOTIFY = 'fff1';
const UUID_CHAR_WRITE = 'fff2';


export class ChipseaScaleDevice extends BodyscaleDeviceBase {

	constructor(protected service: CordovaBodyscaleService, id: string, name: string, extra?: object) {
		super(service?.ble, id, name, extra);
		this.className = 'ChipseaScaleDevice';
	}

	/**
	 * 이 장치의 이름이 주어진 문자열을 포함하고 있는지 여부를 반환한다.
	 * @param devicename 장치명에 포함될 기기명
	 */
	static nameContiains(devicename: string): boolean {
		return devicename.includes('Chipsea');
	}

	async first_connect_callback(): Promise<boolean> {
		this.general_connect_callback();
		return true;
	}

	async repeated_connect_callback(): Promise<boolean> {
		this.general_connect_callback();
		return true;
	}

	sync_callback(): Promise<boolean> {
		throw new Error('Method not implemented.');
	}

	private general_connect_callback() {
		let status: number = 0;
		// status 0 : fluctuating. print everytime
		// status 1 : fixed. stop printing
		// transition from 0 to 1 : Send fixed number
		// this.writeHex('ca 0a 10 00 5d1c5908 80 1f b4 00 3f');

		// 알람 시작
		this.startNotification(UUID_SERVICE, UUID_CHAR_NOTIFY).subscribe(
			async (buffer) => {

				const packet: BodyscaleMeasurement = parsePacket(buffer);
				const fixed: boolean = isFixed(buffer);
				// this.logger.log(0, bufferToHex(buffer), `fixed?:${fixed}`)
				// console.log(bufferToHex(buffer), `fixed?:${fixed}`);

				if (status === 0) {

					// 동기화 시작
					this.service.beginSyncData(this);

					// this.bodyscaleDataProvider.refreshBodyscaleRealtime(packet);

					if (fixed) {

						// 알람 중지
						this.stopNotification(UUID_SERVICE, UUID_CHAR_NOTIFY);

						status = 1;

						if (hasBmiValue(buffer)) {
							const bmi: BodyscaleMeasurement = parseBmi(buffer);
							bmi.date = new Date();

							const scaleUser = this.service.getUser();
							bmi.bmi = calculateBmi(bmi.weight, scaleUser.height);

							if (scaleUser.gender === 'male') {
								bmi.fat -= bmi.visceral * 0.98;
							} else {
								bmi.fat -= bmi.visceral * 0.63;
							}

							this.service.putSyncData(bmi);
							// this.bodyscaleDataProvider.addBodyscaleRecent(bmi);
						} else {
							this.service.putSyncData(packet);
							// this.bodyscaleDataProvider.addBodyscaleRecent(packet);
						}

						// 동기화 종료
						this.service.endSyncData(this);
					}
				}

				if (status === 1) {
					if (!fixed) {
						status = 0;
						// this.bodyscaleDataProvider.refreshBodyscaleRealtime(packet);
					}
				}
			})
	}


	private async writeHex(value: string) {
		const hex: string = replaceAll(replaceAll(value, ':', ''), ' ', '');

		// this.logger.log(0, 'write', hex)
		return this.write(UUID_SERVICE, UUID_CHAR_WRITE, Buffer.from(hex, 'hex').buffer);
	}
}

function calculateBmi(weight: number, height: number) {
	// console.log(`weight:${weight}, height:${height}`);
	height = height / 100;
	// console.log('caculated bmi : ',	 weight/(height*height));
	// console.log(`bmi results : ${weight/(height*height)}`);
	return weight / (height * height);
}

function bufferToHex(buffer) {
	return Array
		.from(new Uint8Array(buffer))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
}


function parsePacket(buffer: ArrayBuffer): BodyscaleMeasurement {
	const uBuffer = new Uint8Array(buffer);

	const sMeasure = bufferToHex(buffer.slice(5, 7));
	const weight = parseInt(sMeasure, 16) / 10.0;
	const measure = new BodyscaleMeasurement();
	measure.date = new Date();
	measure.weight = weight;
	return measure;
}

function isFixed(buffer: ArrayBuffer): boolean {
	const uBuffer = new Uint8Array(buffer);
	// tslint:disable-next-line: no-bitwise
	return (uBuffer[4] & 1) !== 0;
}

function parseBmi(buffer: ArrayBuffer): BodyscaleMeasurement {
	const uBuffer = new Uint8Array(buffer);

	const weight = parseInt(bufferToHex(buffer.slice(5, 7)), 16) / 10.0; // 0.1kg
	const fat = parseInt(bufferToHex(buffer.slice(7, 9)), 16) / 10.0;     // 0.1%
	const water = parseInt(bufferToHex(buffer.slice(9, 11)), 16) / 10.0;   // 0.1%
	const muscle = parseInt(bufferToHex(buffer.slice(11, 13)), 16) / 10.0;    // 0.1%
	const bmr = parseInt(bufferToHex(buffer.slice(13, 15)), 16);       // kcal
	const visceralFat = parseInt(bufferToHex(buffer.slice(15, 17)), 16) / 10.0; // 0.1%
	const bone = uBuffer[17] / 10.0;

	const bmi: BodyscaleMeasurement = new BodyscaleMeasurement();
	bmi.date = new Date();
	bmi.weight = weight;
	bmi.fat = fat;
	bmi.water = water;
	bmi.muscle = muscle;
	bmi.bmr = bmr;
	bmi.visceral = visceralFat;
	bmi.bone = bone;

	return bmi;
}

function hasBmiValue(buffer: ArrayBuffer): boolean {
	const uBuffer = (new Uint8Array(buffer)).slice(7, 18);
	return uBuffer.filter(a => a !== 0).length > 0;
}


function replaceAll(str: string, searchStr: string, replaceStr: string): string {
	return str.split(searchStr).join(replaceStr);
}
