import { Injectable, NgZone } from '@angular/core';
import { NativeStorage } from '@ionic-native/native-storage/ngx';
import { BLE } from '@ionic-native/ble/ngx';
import { Observable, Subject, ReplaySubject } from 'rxjs';



import { DeviceBase, EnumDeviceDynamicStatus, EnumDeviceStaticStatus } from '../objects/base/DeviceBase';

import { GlucosemeterDeviceBase } from '../objects/base/GlucosemeterDeviceBase';



import { AutochekBGMDevice } from '../objects/third-party/AutochekBGMDevice';

import { first } from 'rxjs/operators';



import { CordovaGlucosemeterService } from './cordova-glucosmeter.service';
import { CordovaPedometerService } from './cordova-pedometer.service';
import { CordovaBpmeterService } from './cordova-bpmeter.service';
import { CordovaBodyscaleService } from './cordova-bodyscale.service';
import { Q8Device } from 'autochek-device/objects/third-party/Q8Device';
import { PedometerDeviceBase } from 'autochek-device/objects/base/PedometerDeviceBase';
import { QnScaleDevice } from 'autochek-device/objects/third-party/QnScaleDevice';
import { ChipseaScaleDevice } from 'autochek-device/objects/third-party/ChipseaScaleDevice';
import { AutochekSignatureBpmeter } from 'autochek-device/objects/third-party/AutochekSignagureBpmeter';




const deviceList = {
  pedometer: [
    Q8Device
  ],
  glucosemeter: [
    AutochekBGMDevice
  ],
  bodyscale: [
    // IcomonDevice,
    QnScaleDevice,
    ChipseaScaleDevice
  ],
  bpmeter: [
    AutochekSignatureBpmeter
  ],

};

export interface ConnectedDevice {
  pedometer: PedometerDeviceBase[];
  glucosemeter: GlucosemeterDeviceBase[];
  bodyscale: DeviceBase[];
  bpmeter: DeviceBase[];
}

const defaultConnectedDevice: ConnectedDevice = {
  pedometer: [],
  glucosemeter: [],
  bodyscale: [],
  bpmeter: []
};


const devicetypeList = [
  'pedometer',
  'glucosemeter',
  'bodyscale',
  'bpmeter',
];

// Storage Part

interface DeviceInStorage {
  id: string;
  name: string;
  class_name: string;
  extra: string;
}

interface StorageData {
  pedometer: DeviceInStorage[];
  glucosemeter: DeviceInStorage[];
  bodyscale: DeviceInStorage[];
  bpmeter: DeviceInStorage[];
}

const defaultStorageData: StorageData = {
  pedometer: [],
  glucosemeter: [],
  bodyscale: [],
  bpmeter: [],
};





const STORAGE_TAG_CONNECTED_DEVICE: string = 'ConnectedDevices:v04';
/*
History
v04 : Packagized. Multiple devices on each device type
*/




@Injectable()
export class DeviceInfoProvider {
  public connectedDevicesObservable: ReplaySubject<ConnectedDevice> = new ReplaySubject<ConnectedDevice>(1);
  private connectedDevices: ConnectedDevice = null;
  // private storageData: StorageData = null;
  // private connectedDeviceStatus:ConnectedDevicesStatus

  private scanObservable: Subject<DeviceBase> = null;

  private cordovaServices = {};

  constructor(
    private storage: NativeStorage,
    public ble: BLE,
    private ngZone: NgZone,
    private cordovaGlucosemeterService: CordovaGlucosemeterService,
    private cordovaPedometerService: CordovaPedometerService,
    private cordovaBpmeterService: CordovaBpmeterService,
    private cordovaBodyscaleService: CordovaBodyscaleService,
  ) {

    this.cordovaServices = {
      glucosemeter: this.cordovaGlucosemeterService,
      pedometer: this.cordovaPedometerService,
      bpmeter: this.cordovaBpmeterService,
      bodyscale: this.cordovaBodyscaleService,
    };

    this.initConnectedDevices();

  }

  /*
  Scan related
  */

  startScan(devicetype: string): Observable<DeviceBase> {
    this.scanObservable = new Subject<DeviceBase>();
    let devicelist: any;
    // let deviceService: any;


    // if (devicetype === 'pedometer') {
    //   deviceService = this.cordovaPedometerService;
    // } else if (devicetype === 'glucosemeter') {
    //   deviceService = this.cordovaGlucosemeterService;
    // } else if (devicetype === 'bodyscale') {
    //   deviceService = this.cordovaBodyscaleService;
    // } else if (devicetype === 'bpmeter') {
    //   deviceService = this.cordovaBpmeterService;
    // } else {
    //   throw new Error(`No designated device type ${devicetype}`);
    // }
    devicelist = deviceList[devicetype];

    const foundDevice = new Set<string>();
    console.log('deviceInfoProvider - starts scan');
    // this.loggerFirestoreService.logMsg('deviceInfoProvider - starts scan')
    this.ble.startScan([]).subscribe(
      (data) => {
        // console.log('testscan data', data);
        if (foundDevice.has(data.id)) {
          return;
        }
        if (data.name && typeof (data.name) === 'string') {
          for (const dc of devicelist) {
            if (dc.scanCallback(data.name)) {
              const device = new dc(this.cordovaServices[devicetype], data.id, data.name);
              // device.name = data.name;
              // device.id = data.id;
              foundDevice.add(data.id);
              this.scanObservable.next(device);
            }
          }
        }

      },
      (error) => {
        this.scanObservable.complete();

      },
      () => {
        this.scanObservable.complete();

      }
    );
    return this.scanObservable;
  }

  stopScan() {

    this.scanObservable.complete();
    this.ble.stopScan();
  }


  /*
    Storage related
  */

  private removeDevice(device: DeviceBase) {
    console.log('removeDevice', device);
    this.connectedDevices[device.type] = this.connectedDevices[device.type].filter((db) => db.id !== device.id);
    this.connectedDevicesObservable.next(this.connectedDevices);
    this.storage.setItem(STORAGE_TAG_CONNECTED_DEVICE, this.serializer(this.connectedDevices));
  }
  private addDevice(device: DeviceBase) {
    console.log('addDevice', device);
    this.connectedDevices[device.type].push(device);
    this.connectedDevicesObservable.next(this.connectedDevices);
    this.storage.setItem(STORAGE_TAG_CONNECTED_DEVICE, this.serializer(this.connectedDevices));
  }

  private async initConnectedDevices() {
    let storageData: StorageData;
    try {
      storageData = await this.storage.getItem(STORAGE_TAG_CONNECTED_DEVICE);
      console.log('retrieved storage data', storageData);
    } catch (error) {
      if (error.code === 2) {
        console.log('storage was not initialized. init now');
        this.connectedDevices = defaultConnectedDevice;
        this.connectedDevicesObservable.next(this.connectedDevices);
        return;
      } else {
        console.error('initConnectedDevices failed. unknown error ', error);
        return;
      }
    }

    if (storageData) {
      this.connectedDevices = this.deserializer(storageData);
      this.connectedDevicesObservable.next(this.connectedDevices);
      console.log('recovered connectedDevices', this.connectedDevices);
    }


  }

  // connectedDevice->storageData
  private serializer(cds: ConnectedDevice): StorageData {
    const nsds = Object.assign({}, defaultStorageData);
    for (const devicetype of devicetypeList) {
      for (const cd of cds[devicetype]) {
        nsds[devicetype].push({
          id: cd.id, name: cd.name, class_name: cd.class_name,
          extra: cd.extra ? JSON.stringify(cd.extra) : ''
        } as DeviceInStorage);
      }
    }
    return nsds;
  }

  // storageData->connectedDevice
  private deserializer(storageData: StorageData): ConnectedDevice {
    const ncds = Object.assign({}, defaultConnectedDevice);
    console.log('storageData : ', storageData);
    console.log('ncds : ', ncds);
    for (const devicetype of devicetypeList) {
      // console.log(devicetype, storageData[devicetype]);
      for (const d in storageData[devicetype]) {
        const dis = storageData[devicetype][d];
        console.log('looking for devicetype:', devicetype, dis);

        const constructors = deviceList[devicetype];

        for (const cs of constructors) {
          const tclass = new cs(this, '', '');
          console.log(tclass);
          if (tclass.class_name === dis.class_name) {
            ncds[devicetype].push(new cs(this.cordovaServices[devicetype], dis.id, dis.name, dis.extra ? JSON.parse(dis.extra) : {}));
          }

        }

      }
      // const dis: DeviceInStorage = sd[devicetype];

    }
    return ncds;
  }

  async bondDevice(device: DeviceBase): Promise<boolean> {
    const check: DeviceBase[] = this.connectedDevices[device.type].filter((db: DeviceBase) => db.id === device.id);

    if (check.length > 0) { // That device is already bonded
      return false;
    }

    if (device.config.noConnectionOnBond) {
      // When noConnectionOnBond flag is set to true, this device does not try first connection at all.
      this.addDevice(device);
      return true;
    }


    const connectResult = await this.connect_promise(device, true);
    if (connectResult) {
      this.addDevice(device);
    }
    return connectResult;
  }

  async connectDevice(device: DeviceBase): Promise<boolean> {
    const check: DeviceBase[] = this.connectedDevices[device.type].filter((db: DeviceBase) => db.id === device.id);
    if (check.length <= 0) {
      return false; // the device is not bonded;
    }
    return await this.connect_promise(device);
  }


  async syncDevice(device: DeviceBase): Promise<boolean> {
    if (!this.isDeviceBonded(device)) {
      return false;
    }
    if (!device.isInDynamicStatus(EnumDeviceDynamicStatus.Idle)) {
      console.error('Cannot Sync. BLE is busy. Status is not idle ');
    }
    device.setDynamicStatus(EnumDeviceDynamicStatus.Syncing);
    const result = await device.sync_callback();
    device.setDynamicStatus(EnumDeviceDynamicStatus.Idle);
    return result;
  }


  private async connect_callback(device: DeviceBase, isFirst: boolean): Promise<boolean> {
    console.log('connect_callback', device, isFirst);
    if (!device.isInDynamicStatus(EnumDeviceDynamicStatus.Idle)) {

      console.log(`You cannot connect device. Device dynamic status is not Idle`);

      return false;
    }

    let result: boolean;
    device.setDynamicStatus(EnumDeviceDynamicStatus.Connecting);

    // this.connectedDevicesObservable.next(this.connectedDevices);
    if (isFirst) {
      result = await device.first_connect_callback();
    } else {
      result = await device.repeated_connect_callback();
    }
    device.setDynamicStatus(EnumDeviceDynamicStatus.Idle);

    if (!result) {
      // fail
      await this.ble.disconnect(device.id);
    } else {
      device.setStaticStatus(EnumDeviceStaticStatus.Connected);
    }
    return result;

  }

  private async connect_promise(device: DeviceBase, isFirst: boolean = false) {
    console.log('connect-promise', device, isFirst);
    return new Promise<boolean>((res, rej) => {
      this.ble.connect(device.id).subscribe(
        async (peripheral) => { // connect callback
          console.log('connect ble callback', peripheral);
          // res(await this.connect_callback(device, isFirst));
          const rest = await this.generalConnectPostCallback(device, isFirst);
          res(rest);
        },
        async (peripheral) => { // disconnect callback
          console.log('disconnect callback from connect_promise');
          device.setStaticStatus(EnumDeviceStaticStatus.NotConnected);
          // this.autoConnect(devicetype);
        }
      );
    });
  }


  async generalConnectPostCallback(device:DeviceBase, isFirst:boolean){
    const result = await this.connect_callback(device, isFirst);
    if(result && device.config.autoSyncAfterConnection) {
      this.syncDevice(device);
    }
    return result;
  }

  async autoConnect(device: DeviceBase) {
    const check: boolean = this.isDeviceBonded(device);
    if (!check) {
      return;
    }
    if (!device.isInStaticStatus(EnumDeviceStaticStatus.NotConnected)) {
      return;
    }


    device.setStaticStatus(EnumDeviceStaticStatus.Autoconnecting);

    this.ble.autoConnect(device.id,
      () => {
        // this.connect_callback(device);
        this.generalConnectPostCallback(device, false);
      },
      () => {
        device.setStaticStatus(EnumDeviceStaticStatus.NotConnected);
        console.log('disconnect callback after auto-connect');
      }
    );
  }





  public async disconnectDevice(device: DeviceBase): Promise<boolean> {
    const check: boolean = this.isDeviceBonded(device);
    if (!check) {
      return false;
    }
    try {
      console.log('force disconnect from disconnectDevice');
      await this.ble.disconnect(device.id);
      device.setStaticStatus(EnumDeviceStaticStatus.NotConnected);
      return true;
    } catch (error) {
      console.error(error);
    } finally {

    }
    return true;

  }

  public async debondDevice(device: DeviceBase) {
    await this.disconnectDevice(device);
    this.removeDevice(device);
  }

  private isDeviceBonded(device: DeviceBase) {
    return this.connectedDevices[device.type].filter((d: DeviceBase) => d.id === device.id).length > 0;
  }

  public getDeviceFromId(deviceId: string): DeviceBase {
    for(let dk in this.connectedDevices) {
      const dls = this.connectedDevices[dk];
      for(let d of dls) {
        if (d.id===deviceId) {
          return d;
        }
      }
    }
    return  null;
  }

}
