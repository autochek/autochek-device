
import { Subject, Observable, ReplaySubject } from 'rxjs';
import { BLE } from '@ionic-native/ble/ngx';


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
    class_name: string;
    type: string;
    id: string;
    name: string;
    extra: object;

    config: DeviceBaseConfig;

}

export abstract class DeviceBase {
    type: string = 'devicebase';
    id: string;
    name: string;
    class_name: string = 'DeviceBase';
    extra: object;

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

    static scanCallback(devicename: string): boolean {
        return false;
    }

    public setStaticStatus(nStatus: EnumDeviceStaticStatus) {
        this.staticStatus = nStatus;
        this.staticStatusSubject.next(nStatus);
    }

    public setDynamicStatus(nStatus: EnumDeviceDynamicStatus) {
        this.dynamicStatus = nStatus;
        this.dynamicStatusSubject.next(nStatus);
    }

    public isInStaticStatus(cStatus: EnumDeviceStaticStatus) {
        return this.staticStatus === cStatus;
    }

    public isInDynamicStatus(cStatus: EnumDeviceDynamicStatus) {
        return this.dynamicStatus === cStatus;
    }







    constructor(ble: BLE, id: string, name: string, extra?: object) {
        this.ble = ble;
        this.id = id;
        this.name = name;
        this.extra = extra;



        this.progress = new Subject<string>();

        this.setStaticStatus(EnumDeviceStaticStatus.NotConnected);
        this.setDynamicStatus(EnumDeviceDynamicStatus.Idle);

    }


    toJSON() {
        return {
            class_name: this.class_name,
            type: this.type,

            id: this.id,
            name: this.name,
            extra: this.extra,

            // noConnectionOnBond: this.noConnectionOnBond,
            // setAutoConnection: this.setAutoConnection,

            jsonConcat: (o2) => {
                for (const key in o2) {
                    this[key] = o2[key];
                }
                return this;
            }
        };
    }

    pushProgressString(msg: string) {
        this.progress.next(msg);
    }





    protected startNotification(serviceUUID: string, characteristicUUID: string): Observable<any> {
        return this.ble.startNotification(this.id, serviceUUID, characteristicUUID);
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
