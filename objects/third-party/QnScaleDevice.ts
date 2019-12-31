import { BodyscaleDeviceBase } from '../base/BodyscaleDeviceBase';


// const UUID_SERVICE = '0000ffb0-0000-1000-8000-00805f9b34fb';
// const UUID_CHAR_NOTIFY = '0000ffb2-0000-1000-8000-00805f9b34fb'
// const UUID_CHAR_WRITE = '0000ffb1-0000-1000-8000-00805f9b34fb';

const UUID_SERVICE = 'fff0';
const UUID_CHAR_NOTIFY = 'fff1';

// QN-Scale / White one / Will be sold later
// '04:AC:44:03:25:82'
// fff0  - fff1 (notify)
//      - fff2 (write without response)


export class QnScaleDevice extends BodyscaleDeviceBase {

    static scanCallback(devicename: string): boolean {
        return devicename.includes('QN-Scale');
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
        this.startNotification(UUID_SERVICE, UUID_CHAR_NOTIFY).subscribe(
            (buffer) => {
                const hex = bufferToHex(buffer);
                console.log(buffer);
                console.log(hex);
            });
    }


}

function bufferToHex(buffer) {
    return Array
        .from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
