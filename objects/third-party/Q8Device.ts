import { Buffer } from 'buffer';
import { Subject } from 'rxjs';
import { PedometerDeviceBase } from '../base/PedometerDeviceBase';
import * as moment from 'moment';
import {
    PedometerDaySummary, PedometerTimeSegment, PedometerSleepSummary, PedometerSleepSegment,
    PedometerHeartrateSegment
} from 'autochek-base/objects/device-data-object';
import { CordovaPedometerService } from 'autochek-device/services/cordova-pedometer.service';



const UUID_SERVICE = '000001ff-3c17-d293-8e48-14fe2e4da212';
const UUID_CHAR_NOTIFY = 'ff03';
const UUID_CHAR_WRITE = 'ff02';


let ACK_OFFSET = 0;


const timeout = 30000;

export class Q8Device extends PedometerDeviceBase {


    private com_l1_queue: L1Packet[];
    private com_acker: Subject<any>;
    private com_is_acked: number;

    private logLevel: number = 2;



    private connection_phase = 0;

    private historyDataRequestList: string[] = ['01', '02', '04', '0a', '0b', '03', '10'];
    private historyDataRequestIndex: number = 0;

    private historyActData: string = '';
    private historyBpData: string = '';
    private historyExcsData: string = '';
    private historySleepData: string = '';



    private pedometerDaySummaries: PedometerDaySummary[];
    private pedometerTimeSegments: PedometerTimeSegment[];
    private pedometerSleepSummaries: PedometerSleepSummary[];
    private pedometerSleepSegments: PedometerSleepSegment[];
    private pedometerHeartrateSegments: PedometerHeartrateSegment[];

    private syncLogString: string = '';


    connection_promise_response: (value: boolean) => void = null;
    sync_promise_response: (value: boolean) => void = null;

    static scanCallback(devicename: string): boolean {
        return devicename.includes('HC92');
    }

    constructor(protected service: CordovaPedometerService, id: string, name: string, extra?: object) {
        super(service.ble, id, name, extra);
        this.class_name = 'Q8Device';


        // this.com_l1_queue = [];
        // this.com_acker = new Subject<any>();
        // this.com_is_acked = -1;
        // ACK_OFFSET = 0;
    }






    async first_connect_callback(): Promise<boolean> {
        if (this.connection_promise_response != null) {
            return false;
        }



        const promise = new Promise<boolean>((res, rej) => {
            this.connection_promise_response = res;
            setTimeout(() => { res(false); }, timeout);
        });

        this.pushProgressString('첫 연결시도 시작');
        this.general_connection_callback();


        this.writeL2('00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:7f:ff:ff:ff:00:00:00', 3, 1);
        const result: boolean = await promise;
        this.connection_promise_response = null;

        return result;
    }



    async repeated_connect_callback(): Promise<boolean> {
        if (this.connection_promise_response != null) {
            return false;
        }


        const promise = new Promise<boolean>((res, rej) => {
            this.connection_promise_response = res;
            setTimeout(() => { res(false); }, timeout);
        });
        this.pushProgressString('재연결시도 시작');
        this.general_connection_callback();
        this.writeL2('00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:7f:ff:ff:ff:00:00:00', 3, 3);
        const result: boolean = await promise;
        this.connection_promise_response = null;


        // this.sync_callback(); // TODO: Test required
        return result;
    }

    async sync_callback(): Promise<boolean> {

        if (!this.com_acker) {
            this.general_connection_callback();
        }
        if (this.sync_promise_response != null) {
            return false;
        }

        // this.general_connection_callback();

        this.historyDataRequestIndex = 0;

        this.historyActData = '';
        this.historyBpData = '';
        this.historyExcsData = '';
        this.historySleepData = '';
        this.syncLogString = '';


        this.pedometerDaySummaries = [];
        this.pedometerTimeSegments = [];
        this.pedometerSleepSegments = [];
        this.pedometerSleepSummaries = [];
        this.pedometerHeartrateSegments = [];

        const promise = new Promise<boolean>((res, rej) => {
            this.sync_promise_response = res;
            setTimeout(() => { res(false); }, timeout);
        });

        this.pushProgressString('동기화 시작');
        this.writeL2(this.historyDataRequestList[this.historyDataRequestIndex], 0x05, 0x01);
        const result: boolean = await promise;
        this.sync_promise_response = null;
        return result;

    }






    general_connection_callback() {
        this.com_l1_queue = [];
        this.com_acker = new Subject<any>();
        this.com_is_acked = -1;
        ACK_OFFSET = 0;

        this.connection_phase = 0;
        // this.connection_result = new Promise<boolean>((res,rej)=>{});


        let l1Collector: L1Packet = null;


        this.startNotification(UUID_SERVICE, UUID_CHAR_NOTIFY).subscribe(
            (buffer) => {
                const packet = new PacketSegment(buffer);

                if (!l1Collector) {
                    l1Collector = new L1Packet(packet);
                } else {
                    l1Collector.appendPacketSegment(packet);
                }

                if (!l1Collector.isFull()) {
                    console.log(0, 'L1 packet is not complete. wait for the next packet');
                    return;
                }

                if (l1Collector.isAckPacket()) {
                    console.log(0, 'Received ack : ' + x2s(l1Collector.ack));

                    this.com_is_acked = l1Collector.ack;
                    this.com_acker.next();
                } else {
                    console.log(0, 'Received full L1 packet' + l1Collector);
                    const l2received = l1Collector.genL2Packet();

                    console.log(1, 'Recieved l2 packet ' + l2received);
                    this.writeAck(l1Collector.ack); // return ack
                    this.handle_notified_l2(l2received);


                }
                l1Collector = null;

            }
        );

        this.com_acker.subscribe(
            () => {

                if (this.com_l1_queue.length === 0) {
                    return;
                }
                if (this.com_is_acked < this.com_l1_queue[0].ack - 1) {
                    return;
                }
                const l1pack = this.com_l1_queue.shift();
                console.log(0, 'Actual L1 packet sending ' + l1pack);
                console.log(1, 'Writing L2 ' + l1pack.genL2Packet());

                l1pack.genPacketSegments().forEach((ps: PacketSegment) => {
                    this.writeToDevice(ps);
                });
            }
        );

    }


    private handle_notified_l2(packet: L2Packet) {
        // console.log(1, 'Recieved packet value : ', packet.value);

        if (packet.cmdid === 3) {
            if (packet.keyid === 2 || packet.keyid === 4) {
                // Connection success. First or repeat. whatever
                const user = this.service.getUser();
                this.writeL2(packUser(user.gender==='male'?1:0, user.age, user.height, user.weight), 2, 0x10);
                // male : 1
                // female : 0
                this.writeL2('01', 2, 0x22);
                this.writeL2('', 2, 0x1e);
            } else {
                this.connection_promise_response(true);

            }

        }

        if (packet.cmdid === 2 && packet.keyid === 0x1f) {
            this.writeL2(packet.value.substring(0, 8), 2, 0x30);
            this.writeL2('0000', 2, 0x26);
            this.writeL2(packet.value.substring(12, 16), 2, 0x1b);
            this.writeL2('ff000000', 2, 0x32);



            this.writeL2(packDate(), 2, 0x01);

            this.connection_phase = 0;
            this.writeL2('', 2, 0x14); // GOTO phase0

        }

        if (packet.cmdid === 2 && packet.keyid === 0x15) {

            if (this.connection_phase === 0) {
                // configure screen
                this.connection_phase++;
                // this.writeL2('02af', 2, 0x18);

                this.writeL2('002f', 2, 0x18); // 00 2f : Time, steps, Distance, calories, heartrate,
                this.writeL2('', 2, 0x14); // GOTO phase1
            } else if (this.connection_phase === 1) {
                this.writeL2('010000059f', 2, 0x1c);
                this.connection_phase++;
                this.configDrinkingWater(true, 120, 540, 1260);
                this.configSedentary(true, 540, 1260);
                this.connection_promise_response(true);
            }
        }

        if (packet.cmdid === 5) { // Data sync procedure
            this.syncLogString += `[${packet.cmdid}] - [${packet.keyid}]||\r\n${packet.value}||\r\n`;
            if (packet.keyid === 0x15) { // realtime data

            }

            if (packet.keyid === 0x30) { // 5 minute segment

                switch (this.historyDataRequestIndex) {
                    case 0:
                        // Act
                        this.pushProgressString('스마트밴드데이터를 받았습니다');
                        this.historyActData += packet.value;
                        break;
                    case 1:
                        // sleep segment
                        this.pushProgressString('수면데이터를 받았습니다');
                        this.historySleepData += packet.value;
                        break;
                    case 5:
                        // Heartrate
                        this.pushProgressString('심박데이터를 받았습니다');
                        this.historyBpData += packet.value;
                        break;

                    case 6:
                        this.pushProgressString('운동 데이터를 받았습니다');
                        this.historyExcsData += packet.value;
                        break;
                }

            }

            if (packet.keyid === 8) { // Historical daty sync end
                this.writeL2('00', 0x05, 0x20);


                // TODO : Handle

                switch (this.historyDataRequestIndex) {
                    case 0: // Act
                        this.pedometerTimeSegments = this.parseActSegment(this.historyActData);
                        this.historyActData = '';
                        break;

                    case 1: // Sleep segment
                        this.pedometerSleepSegments = this.parseSleepSegment(this.historySleepData);
                        this.historySleepData = '';
                        break;

                    case 5: // Heartrate
                        // console.log(2, this.historyBpData);
                        this.pedometerHeartrateSegments = this.parseHeartrate(this.historyBpData);
                        this.historyBpData = '';
                        break;

                    case 6: // Excs
                        console.log(2, this.historyExcsData);
                        this.historyExcsData = '';

                        break;
                }

                this.historyDataRequestIndex++;
                if (this.historyDataRequestIndex < this.historyDataRequestList.length) {
                    this.writeL2(this.historyDataRequestList[this.historyDataRequestIndex], 0x05, 0x01);
                } else { // Wrapup

                    this.writeL2('', 0x05, 0x21);

                }

            }

            if (packet.keyid === 0x22) { // Today summary
                const date = new Date();
                const step: number = parseInt(packet.value.substring(0, 8), 16);
                const dist: number = parseInt(packet.value.substring(8, 16), 16);
                const cal: number = parseInt(packet.value.substring(16, 24), 16);
                console.log(2, "Today's summary", date, step, dist, cal);
                this.pushProgressString('오늘의 요약정보를 받았습니다');
                const daySummary = new PedometerDaySummary(date, step, cal, dist);
                this.pedometerDaySummaries.push(daySummary);
                // this.service.putLogToServer(`PedometerDaySummary of ${moment(daySummary.date).format('YYYYMMDD')} - ${daySummary.step}`);
                this.syncLogString += `PedometerDaySummary of ${moment(daySummary.date).format('YYYYMMDD')} - ${daySummary.step}||\r\n`;
                this.writeL2('', 0x05, 0x23);
            }
            if (packet.keyid === 0x24) { // Sleep info (sequence..)
                this.pedometerSleepSummaries = this.parseSleep(packet.value);

                this.pushProgressString('동기화를 종료중입니다');
                this.service.putLogToServer(this.syncLogString);

                this.service.putPedometerTimeSegments(this.pedometerTimeSegments);
                this.service.putPedometerDaySummary(this.pedometerDaySummaries[0]);
                this.service.putPedometerSleepSegment(this.pedometerSleepSegments);
                this.service.putPedometerHeartrateSegment(this.pedometerHeartrateSegments);
                this.service.putPedometerSleepSummary(this.pedometerSleepSummaries);


                this.service.putSyncDataPostCallback();


                this.sync_promise_response(true);

            }


        }

    }

    private parseActSegment(value: string): PedometerTimeSegment[] {
        const segments: PedometerTimeSegment[] = [];
        const height = this.service.getUser().height;
        const weight = this.service.getUser().weight;

        while (value.length > 0) {
            const length: number = parseInt(value.substring(0, 4), 16);
            const d_date: Date = parseDateBlock(value.substring(4, 8));
            const i_minute: number = parseInt(value.substring(8, 12), 16);

            console.log(1, 'act segment chunk', d_date, i_minute, length);
            const e_idx = 16 + 4 * length;

            let logStartDate: Date = null;
            let logCount: number = 0;
            let logEndDate: Date = null;



            const subvalue: string = value.substring(16, e_idx);
            for (let i = 0; i < length; i++) {
                if ((i * 4 + 4) >= subvalue.length) {
                    // TODO : there are several times... break;
                    break;
                }
                let step: number = parseInt(subvalue.substring(i * 4, i * 4 + 4), 16);
                if (isNaN(step)) {
                    step = 0;
                }
                let minute = i_minute + i * 5;
                console.log(1, 'Parsing datetime log[0]', i_minute, i, minute);
                const hour = Math.floor(minute / 60);
                minute = minute % 60;

                console.log(1, 'Parsing datetime log[1]', hour, minute);
                const d = new Date(d_date);
                d.setHours(hour);
                d.setMinutes(minute);
                d.setSeconds(0);
                logEndDate = d;
                if (!logStartDate) {
                    logStartDate = d;
                }
                logCount++;
                console.log(1, 'Parsing datetime log[2]', d);
                
                const distance = (height/100.0*0.41*step);
                const calories = (height/100.0*weight*0.32096*step)
                segments.push(new PedometerTimeSegment(d, 5, step, calories, distance));
            }
            // this.service.putLogToServer(`PedometerTimeSegment parse summary : ${logCount} from ${moment(logStartDate).format('YYYYMMDD HH:mm')} to ${moment(logEndDate).format('YYYYMMDD HH:mm')}`);
            this.syncLogString += `PedometerTimeSegment parse summary : ${logCount} from ${moment(logStartDate).format('YYYYMMDD HH:mm')} to ${moment(logEndDate).format('YYYYMMDD HH:mm')}||\r\n`;


            value = value.substring(e_idx);
        }


        return segments;
    }

    private parseSleep(value: string): PedometerSleepSummary[] {
        const sleepSummaries: PedometerSleepSummary[] = [];

        while (value.length >= 12) {
            const date: Date = parseDateBlock(value.substring(0, 4));

            if (!date) {
                break;
            }
            const deepsleep = parseInt(value.substring(4, 8), 16);
            const lightsleep = parseInt(value.substring(8, 12), 16);

            const nextdate = moment(date).add(1, 'day').toDate();
            const sleepSummary: PedometerSleepSummary = new PedometerSleepSummary(nextdate, deepsleep, lightsleep);
            console.log(2, `Sleep report - deep:${deepsleep}, light:${lightsleep}`);
            sleepSummaries.push(sleepSummary);
            value = value.substring(12);
        }
        return sleepSummaries;
    }

    private parseSleepSegment(value: string): PedometerSleepSegment[] {
        const segments: PedometerSleepSegment[] = [];

        while (value.length > 0) {
            const length: number = parseInt(value.substring(0, 4), 16);
            const d_date: Date = parseDateBlock(value.substring(4, 8));
            const i_minute: number = parseInt(value.substring(8, 12), 16);

            const e_idx = 16 + 2 * length;

            const subvalue: string = value.substring(16);
            for (let i = 0; i < length; i++) {
                const sleepIndex = parseInt(subvalue.substring(i * 2, i * 2 + 2), 16);
                let minute = i_minute + i * 5;

                const hour = Math.floor(minute / 60);
                minute = minute % 60;

                const d = new Date(d_date);
                d.setHours(hour);
                d.setMinutes(minute);
                d.setSeconds(0);

                segments.push(new PedometerSleepSegment(d, sleepIndex));
            }
            value = value.substring(e_idx);
        }


        return segments;
    }


    private parseHeartrate(value: string): PedometerHeartrateSegment[] {
        const segments: PedometerHeartrateSegment[] = [];

        while (value.length > 0) {
            const length: number = parseInt(value.substring(0, 4), 16);
            const d_date: Date = parseDateBlock(value.substring(4, 8));
            const i_minute: number = parseInt(value.substring(8, 12), 16);

            const e_idx = 16 + 2 * length;

            const subvalue: string = value.substring(16);
            for (let i = 0; i < length; i++) {
                const rate = parseInt(subvalue.substring(i * 2, i * 2 + 2), 16);
                let minute = i_minute + i * 5;

                const hour = Math.floor(minute / 60);
                minute = minute % 60;

                const d = new Date(d_date);
                d.setHours(hour);
                d.setMinutes(minute);
                d.setSeconds(0);

                segments.push(new PedometerHeartrateSegment(d, rate));
            }
            value = value.substring(e_idx);
        }
        return segments;
    }

    private writeL2(value: string, cmdid: number, keyid: number) {
        this.com_l1_queue.push(new L1Packet(new L2Packet(value, cmdid, keyid)));
        this.com_acker.next();
    }

    private writeToDevice(packet: PacketSegment) {
        super.write(UUID_SERVICE, UUID_CHAR_WRITE, packet.buffer).then(
            () => { console.log(0, 'write packet success ' + packet); },
            (err) => { console.log(0, 'write packet err' + packet + ' err-code: ' + err); }
        );
    }

    private writeAck(num: number) {
        console.log(1, 'Sending Ack ' + x2s(num));
        const l1 = new L1Packet(num).genSinglePacketSegment();
        this.writeToDevice(l1);

    }


    // Sedentary
    // [02] 00 [21] 00 05 [01] [03 84] [04 4C]
    //                      Start End


    // DrinkWaterConfig
    // mDrinkWaterConfig.setStart(300);
    // mDrinkWaterConfig.setEnd(500);
    // mDrinkWaterConfig.setInterval(120);
    // [02] 00 [35] 00 09 00 00 78 01 2C 01 F4 FF FF
    //                   [01][120] [300] [500]
    //                 on/off inter start end


    private configSedentary(enable: boolean, start: number, end: number) {
        const value = `${enable ? '01' : '00'}${x2s(start, 4)}${x2s(end, 4)}`;
        this.writeL2(value, 2, 0x21);
    }
    private configDrinkingWater(enable: boolean, interval: number, start: number, end: number) {
        const value = `${enable ? '01' : '00'}${x2s(interval, 4)}${x2s(start, 4)}${x2s(end, 4)}`;
        this.writeL2(value, 2, 0x35);
    }

    private leveledLog(level: number, ...args) {
        if (this.logLevel <= level) {
            console.log(...args);
        }
    }






}

class PacketBase {
    str: string;
    public toString(): string {
        return this.str.match(/.{1,2}/g).join(':');
    }
}

class L1Packet extends PacketBase {
    length: number;
    crc: number;
    ack: number;


    constructor(data: number | L2Packet | PacketSegment) {
        super();


        if (typeof (data) === 'number') {
            this.str = 'ab1000000000' + x2s(data, 4);
            this.length = 0;
            this.crc = 0;
            this.ack = data;
        }
        if (data instanceof L2Packet) {
            this.length = data.str.length / 2;
            this.crc = crc16Arc(data.str);
            this.ack = ACK_OFFSET++;

            const l1_header = 'ab00' + x2s(this.length, 4)
                + x2s(this.crc, 4) // crc
                + x2s(this.ack, 4);

            this.str = l1_header + data.str;
        }
        if (data instanceof PacketSegment) {
            this.str = data.str;
            this.length = parseInt(this.str.substring(4, 8), 16);
            this.crc = parseInt(this.str.substring(8, 12), 16);
            this.ack = parseInt(this.str.substring(12, 16), 16);
        }
    }

    genPacketSegments(): PacketSegment[] {
        return this.str.match(/.{1,40}/g).map((str) => new PacketSegment(str, this));
    }

    genSinglePacketSegment(): PacketSegment {
        return new PacketSegment(this.str, this);
    }


    genL2Packet(): L2Packet {
        return new L2Packet(this.str.substring(16));
    }

    isFull(): boolean {
        return this.length * 2 + 16 <= this.str.length;
    }

    appendPacketSegment(packet: PacketSegment): boolean {
        this.str += packet.str;
        return this.isFull();
    }

    isAckPacket() {
        return this.str.toLowerCase().startsWith('ab10') &&
            this.length === 0 &&
            this.crc === 0;
    }




    public toString(): string {
        return '[L1 : ' + super.toString() + ']';
    }
}

class PacketSegment extends PacketBase {
    buffer: ArrayBuffer;
    parent: string;

    constructor(value: string | ArrayBuffer, parent: L1Packet = null) {
        super();
        if (typeof (value) === 'string') {
            this.str = value;
            this.buffer = Buffer.from(value, 'hex').buffer;
        }
        if (value instanceof ArrayBuffer) {
            this.buffer = value;
            this.str = bufferToHex(this.buffer);
        }

        if (parent) {
            // console.log('PacketSegment '+super.toString()+' was made from '+parent.toString());
            this.parent = parent.toString();
        } else {
            this.parent = '';
        }
    }

    public isL1Header(): boolean {
        return this.str.toLowerCase().startsWith('ab');
    }


    public toString(): string {
        return '[Packet : ' + super.toString() + (this.parent ? ' part of ' + this.parent : '') + ']';
    }

}

class L2Packet extends PacketBase {

    cmdid: number;
    keyid: number;
    length: number;
    value: string;




    constructor(value: string, cmdid?: number, keyid?: number) {

        super();
        if (!cmdid && !keyid) { // Generate from L1Packet
            this.str = value;
            this.cmdid = parseInt(value.substring(0, 2), 16);
            this.keyid = parseInt(value.substring(4, 6), 16);
            this.length = parseInt(value.substring(6, 10), 16);
            this.value = value.substring(10);
        } else {
            this.cmdid = cmdid;
            this.keyid = keyid;
            this.value = reduce_hexstring(value);
            this.length = this.value.length / 2;

            const l2_header = x2s(cmdid, 2) + x2s(0, 2) + x2s(keyid, 2) + x2s(this.length, 4);


            this.str = l2_header + this.value;
        }
    }



    public toString(): string {
        return `[L2 : ${x2s(this.cmdid)} | ${x2s(this.keyid)} | ${this.value}]`;

    }


}


/*
Packet parsing libraries
*/
const crctable: number[] = [
    0x0000, 0xC0C1, 0xC181, 0x0140, 0xC301, 0x03C0, 0x0280, 0xC241,
    0xC601, 0x06C0, 0x0780, 0xC741, 0x0500, 0xC5C1, 0xC481, 0x0440,
    0xCC01, 0x0CC0, 0x0D80, 0xCD41, 0x0F00, 0xCFC1, 0xCE81, 0x0E40,
    0x0A00, 0xCAC1, 0xCB81, 0x0B40, 0xC901, 0x09C0, 0x0880, 0xC841,
    0xD801, 0x18C0, 0x1980, 0xD941, 0x1B00, 0xDBC1, 0xDA81, 0x1A40,
    0x1E00, 0xDEC1, 0xDF81, 0x1F40, 0xDD01, 0x1DC0, 0x1C80, 0xDC41,
    0x1400, 0xD4C1, 0xD581, 0x1540, 0xD701, 0x17C0, 0x1680, 0xD641,
    0xD201, 0x12C0, 0x1380, 0xD341, 0x1100, 0xD1C1, 0xD081, 0x1040,
    0xF001, 0x30C0, 0x3180, 0xF141, 0x3300, 0xF3C1, 0xF281, 0x3240,
    0x3600, 0xF6C1, 0xF781, 0x3740, 0xF501, 0x35C0, 0x3480, 0xF441,
    0x3C00, 0xFCC1, 0xFD81, 0x3D40, 0xFF01, 0x3FC0, 0x3E80, 0xFE41,
    0xFA01, 0x3AC0, 0x3B80, 0xFB41, 0x3900, 0xF9C1, 0xF881, 0x3840,
    0x2800, 0xE8C1, 0xE981, 0x2940, 0xEB01, 0x2BC0, 0x2A80, 0xEA41,
    0xEE01, 0x2EC0, 0x2F80, 0xEF41, 0x2D00, 0xEDC1, 0xEC81, 0x2C40,
    0xE401, 0x24C0, 0x2580, 0xE541, 0x2700, 0xE7C1, 0xE681, 0x2640,
    0x2200, 0xE2C1, 0xE381, 0x2340, 0xE101, 0x21C0, 0x2080, 0xE041,
    0xA001, 0x60C0, 0x6180, 0xA141, 0x6300, 0xA3C1, 0xA281, 0x6240,
    0x6600, 0xA6C1, 0xA781, 0x6740, 0xA501, 0x65C0, 0x6480, 0xA441,
    0x6C00, 0xACC1, 0xAD81, 0x6D40, 0xAF01, 0x6FC0, 0x6E80, 0xAE41,
    0xAA01, 0x6AC0, 0x6B80, 0xAB41, 0x6900, 0xA9C1, 0xA881, 0x6840,
    0x7800, 0xB8C1, 0xB981, 0x7940, 0xBB01, 0x7BC0, 0x7A80, 0xBA41,
    0xBE01, 0x7EC0, 0x7F80, 0xBF41, 0x7D00, 0xBDC1, 0xBC81, 0x7C40,
    0xB401, 0x74C0, 0x7580, 0xB541, 0x7700, 0xB7C1, 0xB681, 0x7640,
    0x7200, 0xB2C1, 0xB381, 0x7340, 0xB101, 0x71C0, 0x7080, 0xB041,
    0x5000, 0x90C1, 0x9181, 0x5140, 0x9301, 0x53C0, 0x5280, 0x9241,
    0x9601, 0x56C0, 0x5780, 0x9741, 0x5500, 0x95C1, 0x9481, 0x5440,
    0x9C01, 0x5CC0, 0x5D80, 0x9D41, 0x5F00, 0x9FC1, 0x9E81, 0x5E40,
    0x5A00, 0x9AC1, 0x9B81, 0x5B40, 0x9901, 0x59C0, 0x5880, 0x9841,
    0x8801, 0x48C0, 0x4980, 0x8941, 0x4B00, 0x8BC1, 0x8A81, 0x4A40,
    0x4E00, 0x8EC1, 0x8F81, 0x4F40, 0x8D01, 0x4DC0, 0x4C80, 0x8C41,
    0x4400, 0x84C1, 0x8581, 0x4540, 0x8701, 0x47C0, 0x4680, 0x8641,
    0x8201, 0x42C0, 0x4380, 0x8341, 0x4100, 0x81C1, 0x8081, 0x4040,
];

function crc16Arc(hexstr: string) {
    const hexbytes: number[] = s2xs(hexstr);
    let crc: number = 0x0000;
    for (const b of hexbytes) {
        // tslint:disable-next-line: no-bitwise
        crc = (crc >>> 8) ^ crctable[(crc ^ b) & 0xff];
    }
    return crc;
}

function s2xs(str: string): number[] {
    return str.match(/.{1,2}/g).map((s: string) => parseInt(s, 16));
}

function x2s(num: number, paddings: number = 0): string {
    return (num).toString(16).padStart(paddings, '0');
}

function num2binary(num: number, paddings: number = 0): string {
    return (num).toString(2).padStart(paddings, '0');
}

function binaryToHex(bin: string): string {
    return bin.match(/.{1,8}/g).map((s: string) => x2s(parseInt(s, 2), 2)).join('');

}

function hexToBinary(hex: string): string {
    return hex.match(/.{1,2}/g).map((s: string) => num2binary(parseInt(s, 16), 8)).join('');
}

function bufferToHex(buffer) {
    return Array
        .from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function reduce_hexstring(str: string): string {
    if (str.substring(0, 2).toLowerCase().startsWith('0x')) {
        str = str.substring(2);
    }
    return str.replace(/:/g, '');
}


function packUser(gender: number, age: number, height: number, weight: number): string {
    let res = '';
    res += gender;
    height = Math.floor(height * 2);
    weight = Math.floor(weight * 2);

    res += num2binary(age, 7);
    res += num2binary(height, 9);
    res += num2binary(weight, 10);
    res += '00000';

    console.log('packUser', gender, age, height, weight, res, binaryToHex(res));
    return binaryToHex(res);
}

function packDate(): string {
    const date = new Date();
    let res = '';

    res += num2binary(date.getFullYear() - 2000, 6);
    res += num2binary(date.getMonth() + 1, 4);
    res += num2binary(date.getDate(), 5);
    res += num2binary(date.getHours(), 5);
    res += num2binary(date.getMinutes(), 6);
    res += num2binary(date.getSeconds(), 6);

    console.log('pack date', date.getFullYear(), date.getMonth(), date.getDate(),
        date.getHours(), date.getMinutes(), date.getSeconds(), res, binaryToHex(res));

    return binaryToHex(res);
}


function parseDateBlock(block: string): Date { // Hex
    block = hexToBinary(block);
    const year = parseInt(block.substring(1, 7), 2);
    const month = parseInt(block.substring(7, 11), 2);
    const date = parseInt(block.substring(11, 16), 2);

    const ddate = new Date();

    if (year === 0 && month === 0 && date === 0) {
        return null;
    }

    console.log('parseDateBlock', year, month, date);
    try {
        ddate.setFullYear(year + 2000);
        ddate.setMonth(month - 1);
        ddate.setDate(date);
    } catch (error) {
        console.error(error);
        return null;
    }
    console.log('parseDateBlock', ddate);
    return ddate;
}
