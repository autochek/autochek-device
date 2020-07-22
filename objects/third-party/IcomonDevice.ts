import {BodyscaleDeviceBase} from '../base/BodyscaleDeviceBase';


const UUID_SERVICE = '0000ffb0-0000-1000-8000-00805f9b34fb';
const UUID_CHAR_NOTIFY = '0000ffb2-0000-1000-8000-00805f9b34fb';
const UUID_CHAR_WRITE = '0000ffb1-0000-1000-8000-00805f9b34fb';


// Chipsea-BLE / Black one / Selling
// 'C8:B2:1E:5E:E3:D8'
// extending QN-scale


// QN-Scale / White one / Will be sold later
// '04:AC:44:03:25:82'
// fff0  - fff1 (notify)
//      - fff2 (write without response)


export class IcomonDevice extends BodyscaleDeviceBase {

	/**
	 * 이 장치의 이름이 주어진 문자열을 포함하고 있는지 여부를 반환한다.
	 * @param devicename 장치명에 포함될 기기명
	 */
	static nameContiains(devicename: string): boolean {
		return devicename.includes('Icomon');
	}


	first_connect_callback(): Promise<boolean> {
		throw new Error('Method not implemented.');
	}

	repeated_connect_callback(): Promise<boolean> {
		throw new Error('Method not implemented.');
	}

	sync_callback(): Promise<boolean> {
		throw new Error('Method not implemented.');
	}


}
