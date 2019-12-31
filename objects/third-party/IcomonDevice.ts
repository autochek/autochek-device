import { BodyscaleDeviceBase } from '../base/BodyscaleDeviceBase';


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

    static scanCallback(devicename: string): boolean {
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
