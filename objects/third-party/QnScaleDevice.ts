import { BodyscaleDeviceBase } from '../base/BodyscaleDeviceBase';
import { CordovaBodyscaleService } from 'autochek-device/services/cordova-bodyscale.service';

import { Buffer } from 'buffer';
import { BodyscaleMeasurement } from 'autochek-base/objects/device-data-object';


// const UUID_SERVICE = '0000ffb0-0000-1000-8000-00805f9b34fb';
// const UUID_CHAR_NOTIFY = '0000ffb2-0000-1000-8000-00805f9b34fb'
// const UUID_CHAR_WRITE = '0000ffb1-0000-1000-8000-00805f9b34fb';

const UUID_SERVICE = 'ffe0';
const UUID_CHAR_NOTIFY = 'ffe1';
const UUID_CHAR_WRITE = 'ffe3';
// QN-Scale / White one / Will be sold later
// '04:AC:44:03:25:82'
// fff0  - fff1 (notify)
//      - fff2 (write without response)


export class QnScaleDevice extends BodyscaleDeviceBase {

    static scanCallback(devicename: string): boolean {
        return devicename.includes('QN-Scale');
    }

    constructor(protected service: CordovaBodyscaleService, id: string, name: string, extra?: object) {
        super(service.ble, id, name, extra);
        this.class_name = 'QnScaleDevice';
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
        let scaleType = 0;
        let weightRatio = 100;

        let realtimeWeight = 0;

        this.write(UUID_SERVICE, 'ffe5', Buffer.from('4204','hex').buffer); // TODO
        
        this.startNotification(UUID_SERVICE, UUID_CHAR_NOTIFY).subscribe(
            (buffer) => {
                const hex = bufferToHex(buffer);
                const int8 = new Int8Array(buffer);
                // console.log(UUID_CHAR_NOTIFY, hex);

                const packet = new Packet(buffer);
                console.log('packet', packet);

                if(packet.cmd===0x12) {
                    console.log('first packet recieved');
                    scaleType = int8[2];
                    weightRatio = (int8[10]&1)===1?100:10;
                    
                    const writePacket = new Packet().set(0x13, scaleType, '0110ac1e00'); // TODO : user goes here
                    console.log('writePacket', writePacket);

                    this.write(UUID_SERVICE, 'ffe3', writePacket.buffer);
                    // this.writePacket(writePacket);
                }

                if(packet.cmd===0x14) {
                    let millis = new Date().getMilliseconds() - 946652400;
                    const writePacket = new Packet().set(0x20, scaleType, intToLittleEndianHex(millis));

                    console.log('writePacket', writePacket);
                    this.write(UUID_SERVICE, 'ffe4', writePacket.buffer);


                }

                if(packet.cmd===0x21) {
                    const writePacket = new Packet().set(0x22, scaleType, '');
                    this.write(UUID_SERVICE, 'ffe4', writePacket.buffer);
                }

                if(packet.cmd === 0x23) { // History data. just skip

                }

                if(packet.cmd === 0x10) {
                    const weight = (int8[3]*0x100 + int8[4]) / weightRatio;
                    if(int8[5]===0) {
                        
                    }
                    if(int8[5]===1) {
                        //"186501025e0209"
                        const targetUnit = int8[6]*0x100+int8[7];
                        const interval = int8[8]*0x100+int8[9];
                        let leftWeight = 0;
                        if(packet.length === 14) {
                            leftWeight = (int8[11]*0x100+int8[12])/weightRatio;
                        }

                        const bmi = new BodyscaleMeasurement();
                        bmi.weight = weight;
                        bmi.date = new Date();
                        this.service.putBodyscaleMeasurement(bmi);

                        this.write(UUID_SERVICE, 'ffe3', Buffer.from('1f05151049','hex').buffer); //TODO what is it?
                        // TODO : When byte[3]==01, write some kind of ack packet
                    // Write ffe3 1F 05 15 10 49  
                        
                    }
                    


                    realtimeWeight = weight;
                }

                


            });
        this.startNotification(UUID_SERVICE, 'ffe2').subscribe(
            (buffer) => {
                const hex = bufferToHex(buffer);
                // console.log(buffer);
                console.log('ffe2', hex);
            });
        // this.startNotification(UUID_SERVICE, 'feb3').subscribe(
        //     (buffer) => {
        //         const hex = bufferToHex(buffer);
        //         // console.log(buffer);
        //         console.log('fed6', hex);
        //     });
    }
    

    writePacket(packet:Packet){
        console.log('write hex : ', bufferToHex(packet.buffer), UUID_SERVICE, UUID_CHAR_WRITE);
        this.write(UUID_SERVICE, UUID_CHAR_WRITE, packet.buffer);
    }

}

function bufferToHex(buffer) {
    return Array
        .from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function intarrayToHex(nums:number[]){
    let restr = '';
    for (const num of nums) {
        restr+= n2x(num&0xFF);
    }
    // console.log('intarrayToHex',restr);
    return restr;
}


function intToLittleEndianHex(num:number) {
    let restr = '';
    while(num>0) {
        const rem = num % 0x100;
        num = Math.floor(num/0x100);

        restr = n2x(num)+restr;
    }
    return restr;
}

function n2x(num: number, paddings: number = 2): string {
    return (num).toString(16).padStart(paddings, '0');
}

interface Packet{
    cmd:number,
    length:number,
    devicetype:number,
    value:string,
    checksum:number,
    buffer:ArrayBuffer,
}
class Packet {
    public static generate(cmd:number, devicetype:number, value:string): Packet {
        return new Packet().set(cmd, devicetype, value);
    }
    constructor(buffer?:ArrayBuffer) {
        if(!buffer)
            return;

        const int8 = new Int8Array(buffer)
        this.buffer = buffer
        this.cmd = int8[0];
        this.length = int8[1];
        this.devicetype = int8[2];
        this.value = bufferToHex(buffer.slice(3,buffer.byteLength-1));
        this.checksum = int8[int8.length-1];
    }
    public set(cmd:number, devicetype:number, value:string|number[]): Packet{
        this.cmd = cmd;
        
        this.devicetype = devicetype;
        if(Array.isArray(value)) {
            this.value = intarrayToHex(value);
            
        } else if(typeof(value)==='string') {
            this.value = value;
            
        }
        this.length = (this.value.length/2)+4;
        
    
        const preb = Buffer.from(intarrayToHex([cmd, this.length, devicetype]),'hex');
        const valb = Buffer.from(this.value, 'hex');
        
        
        let sum = this.cmd+this.length+this.devicetype;
        
        
        for(const byte of new Int8Array(valb)) {
            sum+= byte;
        }
        
        this.checksum = sum&0xFF;;
        const checkb = Buffer.from(intarrayToHex([this.checksum]),'hex');
        this.buffer = Buffer.concat([preb, valb, checkb]).buffer;

        return this;
    }
    

    // Buffer.from(value, 'hex').buffer;

    
}