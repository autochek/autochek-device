import {Subject, Observable, ReplaySubject} from 'rxjs';
import {BLE} from '@ionic-native/ble/ngx';


export enum EnumDeviceStaticStatus {
	NotConnected = 0, // Idle, Connecting
	Autoconnecting = 1, // Idle, Connecting
	Connected = 10, // Idle, Syncing
}

export enum EnumDeviceDynamicStatus {
	Idle = 0, // NotConnected, AutoConnecting, Connected
	Connecting = 1, // NotConnected, AutoConnecting
	Syncing = 2, // Connected
}

export interface DeviceBaseConfig {
	noConnectionOnBond: boolean;
	setAutoConnection: boolean;
	autoSyncAfterConnection: boolean;
}

export interface DeviceBase {
	/**
	 * 장치 타입
	 */
	type: string;
	/**
	 * 장치 아이디
	 */
	id: string;
	/**
	 * 장치명
	 */
	name: string;
	/**
	 * 장치 클래스명
	 */
	className: string;
	/**
	 * 부가 데이터
	 */
	extra: object;
	/**
	 * 검색되었는지 여부
	 */
	isScanned: boolean;

	config: DeviceBaseConfig;

}

export abstract class DeviceBase {
	/**
	 * 장치 타입
	 */
	type: string = 'devicebase';
	/**
	 * 장치 아이디
	 */
	id: string;
	/**
	 * 장치명
	 */
	name: string;
	/**
	 * 장치 클래스명
	 */
	className: string = 'DeviceBase';
	/**
	 * 부가 데이터
	 */
	extra: object;
	/**
	 * 검색되었는지 여부
	 */
	isScanned: boolean = false;

	config: DeviceBaseConfig = {
		noConnectionOnBond: false,
		setAutoConnection: true,
		autoSyncAfterConnection: true,
	};


	progress: Subject<string>;

	protected ble: BLE;


	private staticStatus: EnumDeviceStaticStatus = EnumDeviceStaticStatus.NotConnected;
	private dynamicStatus: EnumDeviceDynamicStatus = EnumDeviceDynamicStatus.Idle;
	public staticStatusSubject: ReplaySubject<EnumDeviceStaticStatus> = new ReplaySubject<EnumDeviceStaticStatus>(1);
	public dynamicStatusSubject: ReplaySubject<EnumDeviceDynamicStatus> = new ReplaySubject<EnumDeviceDynamicStatus>(1);

	/**
	 * 생성자
	 * @param ble 저전력 bluetooth 장치 객체
	 * @param id 장치 아이디
	 * @param name 장치명
	 * @param extra 확장 데이터 객체
	 */
	constructor(ble: BLE, id: string, name: string, extra?: object) {
		this.ble = ble;
		this.id = id;
		this.name = name;
		this.extra = extra;
		this.isScanned = false;

		this.progress = new Subject<string>();

		this.setStaticStatus(EnumDeviceStaticStatus.NotConnected);
		this.setDynamicStatus(EnumDeviceDynamicStatus.Idle);

	}

	/**
	 * 이 장치의 이름이 주어진 문자열을 포함하고 있는지 여부를 반환한다.
	 * @param devicename 장치명에 포함될 기기명
	 */
	static nameContiains(devicename: string): boolean {
		return false;
	}

	public setStaticStatus(nStatus: EnumDeviceStaticStatus) {
		console.log(this.type, "setStaticStatus", this.staticStatus, "->", nStatus);
		this.staticStatus = nStatus;
		this.staticStatusSubject.next(nStatus);
	}

	public setDynamicStatus(nStatus: EnumDeviceDynamicStatus) {
		console.log(this.type, "setDynamicStatus", this.dynamicStatus, "->", nStatus);
		this.dynamicStatus = nStatus;
		this.dynamicStatusSubject.next(nStatus);
	}

	public isInStaticStatus(cStatus: EnumDeviceStaticStatus) {
		return this.staticStatus === cStatus;
	}

	public isInDynamicStatus(cStatus: EnumDeviceDynamicStatus) {
		return this.dynamicStatus === cStatus;
	}


	toJSON() {
		return {
			className: this.className,
			type: this.type,

			id: this.id,
			name: this.name,
			extra: this.extra,

			// noConnectionOnBond: this.noConnectionOnBond,
			// setAutoConnection: this.setAutoConnection,

			jsonConcat: (o2) => {
				for (const key of Object.keys(o2)) {
					this[key] = o2[key];
				}
				return this;
			}
		}
	}

	pushProgressString(msg: string) {
		this.progress.next(msg);
	}


	protected startNotification(serviceUUID: string, characteristicUUID: string): Observable<any> {
		return this.ble.startNotification(this.id, serviceUUID, characteristicUUID);
	}

	protected stopNotification(serviceUUID: string, characteristicUUID: string): Promise<any> {
		return this.ble.stopNotification(this.id, serviceUUID, characteristicUUID);
	}

	protected write(serviceUUID: string, characteristicUUID: string, value: ArrayBuffer): Promise<any> {
		return this.ble.write(this.id, serviceUUID, characteristicUUID, value);
	}

	protected read(serviceUUID: string, characteristicUUID: string): Promise<any> {
		return this.ble.read(this.id, serviceUUID, characteristicUUID);
	}

	abstract async first_connect_callback(): Promise<boolean>;

	abstract async repeated_connect_callback(): Promise<boolean>;

	abstract async sync_callback(): Promise<boolean>;
}
