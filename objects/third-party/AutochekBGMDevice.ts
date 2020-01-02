

import { Buffer } from 'buffer';

import * as moment from 'moment';
import { GlucosemeterDeviceBase } from '../base/GlucosemeterDeviceBase';
import { GlucosemeterMeasurement } from 'autochek-base/objects/device-data-object';
import { CordovaGlucosemeterService } from 'autochek-device/services/cordova-glucosmeter.service';



const UUID_SERVICE_DEVICEINFO = '180a';
const UUID_CHARACTERISTIC_MODELNUMBER = '2a24'; // READ
const UUID_CHARACTERISTIC_SERIALNUMBER = '2a25'; // READ

const UUID_SERVICE_GLUCOSE = '1808';
const UUID_CHARACTERISTIC_MEASUREMENT = '2a18';
const UUID_CHARACTERISTIC_CONTEXT = '2a34';
const UUID_CHARACTERISTIC_RACP = '2a52';

const UUID_SERVICE_CUSTOM = 'FFF0';
const UUID_CHARACTERISTIC_CUSTOM = 'FFF1';


export class AutochekBGMDevice extends GlucosemeterDeviceBase {
    private glucosemeterMeasurements: GlucosemeterMeasurement[] = [];

    static scanCallback(devicename: string): boolean {
        return devicename.includes('Auto-Chek');
    }

    
    // connection_success = ()=>{};
    syncdate_success = (br: boolean) => { };
    getrecord_success = (br: boolean) => { };

    constructor(protected service: CordovaGlucosemeterService, id: string, name: string, extra?: object) {
        super(service.ble, id, name, extra);
        this.class_name = 'AutochekBGMDevice';

        this.config.autoSyncAfterConnection = true;
    
    }


    async first_connect_callback(): Promise<boolean> {
        await this.general_connect_precallback();
        return this.syncTime(new Date());
    }

    async repeated_connect_callback(): Promise<boolean> {
        await this.general_connect_precallback();
        return true;
        
    }

    async sync_callback(): Promise<boolean> {
        const res = await this.getRecordFull();

        if (res) {
            this.service.putGlucosemeterMeasurements(this.glucosemeterMeasurements);
            this.glucosemeterMeasurements = [];
        }

        return res;
        
    }

    async general_connect_precallback() {
        const modelnum: string = await this.readAscii(this.id, UUID_SERVICE_DEVICEINFO, UUID_CHARACTERISTIC_MODELNUMBER);
        const serialnum: string = await this.readAscii(this.id, UUID_SERVICE_DEVICEINFO, UUID_CHARACTERISTIC_SERIALNUMBER);

        // let measurementRecords: BGMesaurement[]=[];

        this.startNotification(UUID_SERVICE_GLUCOSE, UUID_CHARACTERISTIC_MEASUREMENT).subscribe(
            async (buffer) => {
                // console.log('measurement recieved', buffer);
                const value: string = bufferToHex(buffer);
                const idx_msr: number = parseInt(bigLittleConversion(value.substring(2, 6)), 16);

                const date_base: Date = parseDate(value.substring(6, 20));
                const time_offset: number = parseInt(bigLittleConversion(value.substring(20, 24)), 10);
                const date_msr: Date = moment(date_base).add(time_offset, 'minute').toDate();
                const bgm: number = parseSfloat(bigLittleConversion(value.substring(24, 28)));

                this.glucosemeterMeasurements.push(new GlucosemeterMeasurement(date_msr, bgm));
            }
        );

        this.startNotification(UUID_SERVICE_GLUCOSE, UUID_CHARACTERISTIC_CONTEXT).subscribe( (buffer) => {
            console.log(0, 'NOTIFY:CONTEXT');
            console.log(0, buffer);
            console.log(0, bufferToHex(buffer));
        });


        this.startNotification(UUID_SERVICE_GLUCOSE, UUID_CHARACTERISTIC_RACP).subscribe(async (buffer) => {
            console.log(0, 'NOTIFY:RACP');
            console.log(0, buffer);
            const hex: string = bufferToHex(buffer);
            console.log(0, hex);

            if (hex.startsWith('0500')) {
                // Record number return
                // let max_record_number:number = parseInt(bigLittleConversion(hex.substring(4)), 16);

                this.writeHex(UUID_SERVICE_GLUCOSE, UUID_CHARACTERISTIC_RACP, '0101'); // Get all
                console.log('get all!')

            }

            if (hex.startsWith('06000101')) { // End of record

            }

            if (hex.startsWith('06000106')) { // Tear procedure
                this.writeHex(UUID_SERVICE_GLUCOSE, UUID_CHARACTERISTIC_RACP, '06000106');
                console.log('get full record done');
                
                // this.service.putGlucosemeterMeasurements(this.glucosemeterMeasurements);
                // this.glucosemeterMeasurements = [];
                this.getrecord_success(true);
                // this.deviceDataProvider.dataSynced();
                
                //this.service.putGlucosemeterMeasurements(this.glucosemeterMeasurements);

            }



        });

        this.startNotification(UUID_SERVICE_CUSTOM, UUID_CHARACTERISTIC_CUSTOM).subscribe(
            (buffer) => {
                console.log(0, 'NOTIFY:CUSTOM');
                console.log(0, bufferToHex(buffer));
                const value: string = bufferToHex(buffer);
                if (value.startsWith('0500')) {
                    // sync date return
                    this.syncdate_success(true);
                }

            }
        );

    }


    private async syncTime(datetime: Date) {

        const packet: string = `c0030100${packDate(datetime)}`;

        const promise = new Promise<boolean>((res, rej) => {
            this.syncdate_success = (br: boolean) => { res(br); };
            setTimeout(() => { res(false); }, 5000);
        });
        this.writeHex(UUID_SERVICE_CUSTOM, UUID_CHARACTERISTIC_CUSTOM, packet);
        return promise;

    }

    private async getRecordFull() {
        console.log('get record full was called');
        this.glucosemeterMeasurements = [];

        const promise = new Promise<boolean>((res, rej) => {
            this.getrecord_success = (br: boolean) => { res(br); };
            setTimeout(() => { res(false); }, 10000);
        });
        this.writeHex(UUID_SERVICE_GLUCOSE, UUID_CHARACTERISTIC_RACP, '0401');
        return promise;
    }



    private async writeHex(u_service: string, u_characteristic: string, hex: string) {
        console.log('AutochekBGMDevice - writeHex', u_service, u_characteristic, hex);
        return this.write(u_service, u_characteristic, Buffer.from(hex, 'hex').buffer as ArrayBuffer);
    }


    private async readAscii(deviceId: string, serviceUUID: string, characteristicUUID: string): Promise<string> {
        return bufferToAscii(await this.read(serviceUUID, characteristicUUID));
    }

}

function bufferToHex(buffer) {
    return Array
        .from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function bufferToAscii(buffer): string {
    return Array.from(new Uint8Array(buffer)).map((b) => String.fromCharCode(b)).join('');
}

function bigLittleConversion(hex: string): string {
    return hex.match(/.{1,2}/g).reverse().join('');
}

function n2x(num: number, paddings: number = 2): string {
    return (num).toString(16).padStart(paddings, '0');
}


function packDate(datetime: Date): string {
    const s_year: string = bigLittleConversion(n2x(datetime.getFullYear(), 4));
    const s_month: string = n2x(datetime.getMonth() + 1);
    const s_date: string = n2x(datetime.getDate());
    const s_hour: string = n2x(datetime.getHours());
    const s_minute: string = n2x(datetime.getMinutes());
    const s_second: string = n2x(datetime.getSeconds());
    return `${s_year}${s_month}${s_date}${s_hour}${s_minute}${s_second}`;
}

function parseDate(dtstr: string): Date {
    const n_year: number = parseInt(bigLittleConversion(dtstr.substring(0, 4)), 16);
    const n_month: number = parseInt(dtstr.substring(4, 6), 16) - 1;
    const n_date: number = parseInt(dtstr.substring(6, 8), 16);
    const n_hour: number = parseInt(dtstr.substring(8, 10), 16);
    const n_minute: number = parseInt(dtstr.substring(10, 12), 16);
    const n_second: number = parseInt(dtstr.substring(12, 14), 16);


    const date = new Date();
    date.setFullYear(n_year);
    date.setMonth(n_month);
    date.setDate(n_date);
    date.setHours(n_hour);
    date.setMinutes(n_minute);
    date.setSeconds(n_second);
    return date;

}

function parseSfloat(sfloat: string): number { // To mmg/dl
    const exponent: number = parseInt(sfloat.substring(0, 1), 16) - 0xb;
    const mantissa: number = parseInt(sfloat.substring(1, 4), 16);

    return mantissa * Math.pow(10, exponent);

}
