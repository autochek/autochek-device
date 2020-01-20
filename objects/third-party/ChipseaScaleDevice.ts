


import { Buffer } from 'buffer';



import { CordovaBodyscaleService } from 'autochek-device/services/cordova-bodyscale.service';
import { BodyscaleDeviceBase } from '../base/BodyscaleDeviceBase';
import { BodyscaleMeasurement } from 'autochek-base/objects/device-data-object';


const UUID_SERVICE = 'fff0';
const UUID_CHAR_NOTIFY = 'fff1';
const UUID_CHAR_WRITE = 'fff2';



export class ChipseaScaleDevice extends BodyscaleDeviceBase {



    constructor(protected service: CordovaBodyscaleService, id: string, name: string, extra?: object) {
        super(service.ble, id, name, extra);
        this.class_name = 'ChipseaScaleDevice';
    }

    // constructor(id:string, name:string){
    //     super(id, name);
    //     this.class_name = 'ChipseaScaleDevice';




    // }

    static scanCallback(devicename: string): boolean {
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

        this.startNotification(UUID_SERVICE, UUID_CHAR_NOTIFY).subscribe(
            (buffer) => {
                const packet: BodyscaleMeasurement = parsePacket(buffer);
                const fixed: boolean = isFixed(buffer);
                // this.logger.log(0, bufferToHex(buffer), `fixed?:${fixed}`)
                console.log(bufferToHex(buffer), `fixed?:${fixed}`);
                if (status === 0) {

                    // this.bodyscaleDataProvider.refreshBodyscaleRealtime(packet);
                    console.log(packet)
                    if (fixed) {
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

                            this.service.putBodyscaleMeasurement(bmi);
                            // this.bodyscaleDataProvider.addBodyscaleRecent(bmi);

                            console.log(bmi);
                        } else {
                            this.service.putBodyscaleMeasurement(packet);
                            // this.bodyscaleDataProvider.addBodyscaleRecent(packet);
                            console.log(packet);
                        }
                    }
                }
                if (status === 1) {
                    if (!fixed) {
                        status = 0;
                        // this.bodyscaleDataProvider.refreshBodyscaleRealtime(packet);
                    }
                }

            });
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
    // console.log('caculated bmi : ',	 weight/(height*height))
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
    const u_buffer = new Uint8Array(buffer);


    const s_measure = bufferToHex(buffer.slice(5, 7));
    const weight = parseInt(s_measure, 16) / 10.0;
    const measure = new BodyscaleMeasurement();
    measure.date = new Date();
    measure.weight = weight;
    return measure;
}

function isFixed(buffer: ArrayBuffer): boolean {
    const u_buffer = new Uint8Array(buffer);
    // tslint:disable-next-line: no-bitwise
    return (u_buffer[4] & 1) !== 0;
}

function parseBmi(buffer: ArrayBuffer): BodyscaleMeasurement {
    const u_buffer = new Uint8Array(buffer);

    const weight = parseInt(bufferToHex(buffer.slice(5, 7)), 16) / 10.0 ; // 0.1kg
    const fat = parseInt(bufferToHex(buffer.slice(7, 9)), 16) / 10.0 ;     // 0.1%
    const water = parseInt(bufferToHex(buffer.slice(9, 11)), 16) / 10.0;   // 0.1%
    const muscle = parseInt(bufferToHex(buffer.slice(11, 13)), 16) / 10.0;    // 0.1%
    const bmr = parseInt(bufferToHex(buffer.slice(13, 15)), 16);       // kcal
    const visceral_fat = parseInt(bufferToHex(buffer.slice(15, 17)), 16) / 10.0; // 0.1%
    const bone = u_buffer[17] / 10.0;

    const bmi: BodyscaleMeasurement = new BodyscaleMeasurement();
    bmi.date = new Date();
    bmi.weight = weight;
    bmi.fat = fat;
    bmi.water = water;
    bmi.muscle = muscle;
    bmi.bmr = bmr;
    bmi.visceral = visceral_fat;
    bmi.bone = bone;

    return bmi;

}

function hasBmiValue(buffer: ArrayBuffer): boolean {
    const u_buffer = (new Uint8Array(buffer)).slice(7, 18);
    return u_buffer.filter(a => a !== 0).length > 0;
}



function replaceAll(str: string, searchStr: string, replaceStr: string): string {
    return str.split(searchStr).join(replaceStr);
}
