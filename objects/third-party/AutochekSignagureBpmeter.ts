import { BloodpressureDeviceBase } from '../base/BloodpressureDeviceBase';
import { CordovaBpmeterService } from 'autochek-device/services/cordova-bpmeter.service';
import { BloodpressureMeasurement } from 'autochek-base/objects/device-data-object';



const UUID_SERVICE = '1810';
const UUID_CHAR_NOTIFY = '2a35';
const UUID_CHAR_READ = '2a49';



export class AutochekSignatureBpmeter extends BloodpressureDeviceBase {

    constructor(protected service: CordovaBpmeterService, id: string, name: string, extra?: object) {
        super(service.ble, id, name, extra);
        this.class_name = 'AutochekSignatureBpmeter';
    }



    static scanCallback(devicename: string): boolean {
        return devicename.includes('01597');
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
        const status: number = 0;
        // status 0 : fluctuating. print everytime
        // status 1 : fixed. stop printing
        // transition from 0 to 1 : Send fixed number
        // this.writeHex('ca 0a 10 00 5d1c5908 80 1f b4 00 3f');

        // [30, -118, 0, 73, 0, 105, 0, -29, 7, 3, 14, 10, 38, 0, 63, 0, 0, 0, 0]
        // [30, 132, 0, 80, 0, 106, 0, 227, 7, 10, 4, 17, 1, 0, 80, 0, 0, 0, 0]

        // [30, 136, 0, 84, 0, 110, 0, 227, 7, 10, 4, 17, 50, 0, 79, 0, 0, 0, 0]


        // 137 87 79
        // [30, 137, 0, 87, 0, 112, 0, 227, 7, 10, 4, 17, 52, 0, 79, 0, 0, 4, 0]
        // [30,
        // 137, 0,
        // 87, 0,
        // 112, 0,
        // 227, 7, 10, 4, 17, 52, 0,
        // 79, 0,
        // 0,
        // 4, 0]


        // Byte[0] flags = 30 = 0x1E = 0b 0001 1110
        // bit[0] = 0 : bp unit ('0'-mmhg, 1-kpa)
        // bit[1] = 1 : has timestamp (0-none, 1-has)
        // bit[2] = 1 : has pulserate (0-none, 1-has)
        // bit[3] = 1 : has userid (0-none, 1-has)
        // bit[4] = 1 : has measurement status  (0-none, 1-has)

        // Byte[1:2] systolic  = 132 0 = 0x 84 00 (sfloat)
        // Byte[3:4] diastolic = 80 0 = 0x 50 00 (sfloat)
        // Byte[5:6] mean arterial = 106 0  = (sfloat)
        // Byte[7:13] Datetime  = 227 7 10 4 17 52 0  = 0x e3 07 0a 04 11 34 00
        // byte[0:1] year = 0x07e3 = 2019
        // byte[2] month : 10
        // byte[3] date : 4
        // byte[4] hour : 17
        // byte[5] minute : 52
        // byte[6] second : 0

        // Byte[14:15] pulserate = 79 0 (sfloat)
        // Byte[16] uid = 0
        // Byte[17:18] flags = 0x 04 00 = 0b 00000100 00000000

        //1e 86 00 47 00 66 00 [e107] [02][0c][07][14][00][50]00000000


        this.startNotification(UUID_SERVICE, UUID_CHAR_NOTIFY).subscribe(
            (buffer) => {
                // console.log('notification result', buffer)

                console.log('packet noticiation recieved from bpmeter', bufferToHex(buffer));
                const ub = new Uint8Array(buffer);
                const systolic: number = ub[1];
                const diastolic: number = ub[3];
                const mean: number = ub[5];
                const rate: number = ub[14];

                const data = new BloodpressureMeasurement();
                data.systolic = systolic;
                data.diastolic = diastolic;
                data.mean = mean;
                data.rate = rate;

                const year = ub[8]*0x100 + ub[7];
                const month = ub[9]-1;
                const date = ub[10];
                const hour = ub[11];
                const minute = ub[12];
                const second = ub[13]
                // data.date = new Date(year, month, date, hour, minute, second);
                data.date = new Date();

                this.service.putBloodpressureMeasurement(data);



            });

    }




}

function bufferToHex(buffer) {
    return Array
        .from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

