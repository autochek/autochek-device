import {Injectable, NgZone} from '@angular/core'
import {NativeStorage} from '@ionic-native/native-storage/ngx'
import {BLE} from '@ionic-native/ble/ngx'
import {Observable, ReplaySubject, Subject} from 'rxjs'


import {DeviceBase, EnumDeviceDynamicStatus, EnumDeviceStaticStatus} from '../objects/base/DeviceBase'

import {GlucosemeterDeviceBase} from '../objects/base/GlucosemeterDeviceBase'

import {AutochekBGMDevice} from '../objects/third-party/AutochekBGMDevice';

import {CordovaGlucosemeterService} from './cordova-glucosmeter.service';
import {CordovaPedometerService} from './cordova-pedometer.service';
import {CordovaBpmeterService} from './cordova-bpmeter.service';
import {CordovaBodyscaleService} from './cordova-bodyscale.service';
import {Q8Device} from 'autochek-device/objects/third-party/Q8Device';
import {PedometerDeviceBase} from 'autochek-device/objects/base/PedometerDeviceBase';
import {QnScaleDevice} from 'autochek-device/objects/third-party/QnScaleDevice';
import {ChipseaScaleDevice} from 'autochek-device/objects/third-party/ChipseaScaleDevice';
import {AutochekSignatureBpmeter} from 'autochek-device/objects/third-party/AutochekSignagureBpmeter';
import {Device} from '@ionic-native/device'


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

}

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
}


const devicetypeList = [
  'pedometer',
  'glucosemeter',
  'bodyscale',
  'bpmeter',
]

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
}


const STORAGE_TAG_CONNECTED_DEVICE: string = 'ConnectedDevices:v04'

/*
History
v04 : Packagized. Multiple devices on each device type
*/


@Injectable()
export class DeviceInfoProvider {
  public connectedDevicesObservable: ReplaySubject<ConnectedDevice> = new ReplaySubject<ConnectedDevice>(1)
  private connectedDevices: ConnectedDevice = null
  // private storageData: StorageData = null;
  // private connectedDeviceStatus:ConnectedDevicesStatus

  private scanObservable: Subject<DeviceBase> = null

  private cordovaServices = {}

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
    }

    this.initConnectedDevices().then(
        () => {
          this.autoConnectAll()
        }
    )

  }

  /**
   * 장치 검색 시작
   * @param devicetype 검색할 장치 타입
   */
  startScan(devicetype: string): Observable<DeviceBase> {

    console.log("DeviceInfoProvider.startScan : ", devicetype);

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

    // 검색된 장치 목록
    const foundDevice = new Set<string>();

    // 장치 검색 시작
    this.ble.startScan([])
        .subscribe(
            (data) => {
              // console.log('testscan data', data);

              // 이미 검색된 장치가 아닌 경우
              if (!foundDevice.has(data.id)) {
                // 장치명이 문자열인 경우
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
              }
            },
            () => {
              this.scanObservable.complete();

            },
            () => {
              this.scanObservable.complete();

            }
        );
    return this.scanObservable;
  }

  /**
   * 장치 검색 중지
   */
  stopScan() {

    console.log("DeviceInfoProvider.stopScan");

    // 장치 검색 감시 중지
    this.scanObservable.complete();
    this.ble.stopScan();
  }


  /**
   * 장치 삭제
   * @param device 삭제할 장치 정보
   */
  private removeDevice(device: DeviceBase) {

    console.log('DeviceInfoProvider.removeDevice', device);

    // 연결된 장치 목록이 존재하지 않는 경우
    if (!this.connectedDevices)
      this.connectedDevices = Object.assign({}, defaultConnectedDevice);

    // 삭제하려는 장비를 제외한 장치 목록을 저장한다.
    this.connectedDevices[device.type] = this.connectedDevices[device.type].filter((db) => db.id !== device.id);
    // 연결된 장치 목록 변경 알람
    this.connectedDevicesObservable.next(this.connectedDevices);
    // 삭제한 후의 연결된 장치 목록 저장
    this.storage.setItem(STORAGE_TAG_CONNECTED_DEVICE, this.serializer(this.connectedDevices));
  }

  /**
   * 장치 추가
   * @param device 추가할 장치 정보
   */
  private addDevice(device: DeviceBase) {

    console.log('DeviceInfoProvider.addDevice', device);

    // 연결된 장치 목록이 존재하지 않는 경우
    if (!this.connectedDevices)
      this.connectedDevices = Object.assign({}, defaultConnectedDevice);

    // 해당 타입에 장비를 추가한다.
    this.connectedDevices[device.type].push(device);
    // 연결된 장치 목록 변경 알람
    this.connectedDevicesObservable.next(this.connectedDevices);
    // 연결된 장치 목록 저장
    this.storage.setItem(STORAGE_TAG_CONNECTED_DEVICE, this.serializer(this.connectedDevices));
  }

  /**
   * 연결된 장치 목록 초기화
   */
  private async initConnectedDevices() {

    console.log('DeviceInfoProvider.initConnectedDevices');

    let storageData: StorageData;

    try {
      // 연결된 장비 목록 저장소를 가져온다.
      storageData = await this.storage.getItem(STORAGE_TAG_CONNECTED_DEVICE);

      console.log('retrieved storage data', storageData);
    }
    catch (error) {
      // 연결된 장비 목록 저장소가 초기화 되어 있지 않은 경우
      if (error.code === 2) {
        // 연결된 장치 목록 초기화 값을 저장
        this.connectedDevices = Object.assign({}, defaultConnectedDevice);
        // 연결된 장치 목록 변경 알람
        this.connectedDevicesObservable.next(this.connectedDevices);
        return;
      }
      // 그 외 에러
      else {
        console.error('initConnectedDevices failed. unknown error ', error);
        return;
      }
    }

    // 연결된 장비 목록 저장소가 유효한 경우
    if (storageData) {
      // 연결된 장비 목록 객체를 가져온다.
      this.connectedDevices = this.deserializer(storageData);
      // 연결된 장치 목록 변경 알람
      this.connectedDevicesObservable.next(this.connectedDevices);
    }

    return;

  }

  /**
   * 모든 장치를 자동 연결 한다.
   */
  private autoConnectAll() {

    console.log('DeviceInfoProvider.autoConnectAll');

    // 연결된 장치 목록이 존재하지 않는 경우
    if (!this.connectedDevices)
      this.connectedDevices = Object.assign({}, defaultConnectedDevice);

    // 모든 장치 타입에 대해서 처리
    for (const devicetype of devicetypeList) {
      // 해당 타입의 모든 장치에 대해서 처리
      for (const device of this.connectedDevices[devicetype]) {

        // 해당 장치가 자동 연결로 설정되어 있는 경우, 자동 연결 처리
        if ((device as DeviceBase).config.setAutoConnection) {
          this.autoConnect(device);
        }
      }
    }
  }

  /**
   * 장비 등록
   * @param device 등록할 장비 정보
   */
  async bondDevice(device: DeviceBase): Promise<boolean> {

    console.log('DeviceInfoProvider.bondDevice', device);

    // 연결 결과
    let result: boolean = false;

    // 기존 장비 목록
    let existDevices: DeviceBase[] = [];

    // 연결된 기기 목록이 존재하는 경우, 해당 기기 타입의 기기 중에 해당 아이디의 기기 목록을 가져온다.
    if (this.connectedDevices && this.connectedDevices[device.type])
      existDevices = this.connectedDevices[device.type].filter((db: DeviceBase) => db.id === device.id);

    // 연결된 기기 중에서 찾을 수 없는 경우
    if (existDevices.length <= 0) { // That device is already bonded

      // 장치 설정에 등록 시 연결하지 않음 설정이 존재하는 경우
      if (device.config.noConnectionOnBond) {
        // 장치 등록
        this.addDevice(device);
        result = true;
      }
      else {
        // 장치 연결
        const connectResult = await this.connect_promise(device, true);

        // 장치에 연결된 경우
        if (connectResult) {
          // 장치 등록
          this.addDevice(device);
          result = true;
        }
      }
    }

    return result;
  }

  /**
   * 장치 연결
   * @param device 연결할 장치 정보
   */
  async connectDevice(device: DeviceBase): Promise<boolean> {

    console.log("DeviceInfoProvider.connectDevice : ", device);

    // 연결 결과
    let result: boolean = false;

    // 기존 장비 목록
    let existDevices: DeviceBase[] = [];

    // 연결된 기기 목록이 존재하는 경우, 해당 기기 타입의 기기 중에 해당 아이디의 기기 목록을 가져온다.
    if (this.connectedDevices && this.connectedDevices[device.type])
      existDevices = this.connectedDevices[device.type].filter((db: DeviceBase) => db.id === device.id);

    // 연결된 장치 목록에 존재하는 경우
    if (existDevices.length > 0) {

      // ios인 경우
      if (Device.platform.toLowerCase() === "ios") {
        const identifiers = await this.ble.peripheralsWithIdentifiers([device.id]);
      }

      // 장치 연결
      result = await this.connect_promise(device);
    }

    return result;
  }

  /**
   * 장치 데이터 연동
   * @param device 데이터 연동할 장치
   */
  async syncDevice(device: DeviceBase): Promise<boolean> {

    console.log("DeviceInfoProvider.syncDevice : ", device);

    let result: boolean = false;

    // 등록된 장치인 경우
    if (this.isDeviceBonded(device)) {
      // 현재 상태가 유휴 상태가 아닌 경우
      if (!device.isInDynamicStatus(EnumDeviceDynamicStatus.Idle)) {
        console.error('Cannot Sync. BLE is busy. Status is not idle ');
      }
      // 현재 상태가 유휴 상태인 경우
      else {
        // 동기화 상태로 설정
        device.setDynamicStatus(EnumDeviceDynamicStatus.Syncing);
        // 동기화
        result = await device.sync_callback();
        // 유휴 상태로 설정
        device.setDynamicStatus(EnumDeviceDynamicStatus.Idle);
      }
    }

    return result;
  }

  /**
   * 등록된 장치인지 여부를 가져온다.
   * @param device 확인할 장치 정보
   */
  private isDeviceBonded(device: DeviceBase) {

    console.log('DeviceInfoProvider.isDeviceBonded', device);

    // 연결된 장치 목록이 존재하지 않는 경우
    if (!this.connectedDevices)
      this.connectedDevices = Object.assign({}, defaultConnectedDevice);

    // 연결된 기기 목록 중에 해당 기기 타입의 기기 중에 해당 아이디의 기기가 존재하는지 여부를 반환한다.
    return this.connectedDevices[device.type].filter((d: DeviceBase) => d.id === device.id).length > 0;
  }

  /**
   * 주어진 장치 아이디에 해당하는 장치 정보를 반환한다.
   * @param deviceId 장치 아이디
   */
  public getDeviceFromId(deviceId: string): DeviceBase {

    console.log('DeviceInfoProvider.getDeviceFromId', deviceId);

    // 모든 장치 타입에 대해서 처리
    for (const devicetype of Object.keys(this.connectedDevices)) {
      // 해당 타입의 모든 장치에 대해서 처리
      for (const device of this.connectedDevices[devicetype]) {
        if (device.id === deviceId) {
          return device;
        }
      }
    }
    return null;
  }

  /**
   * 장치 연결 콜백 함수
   * @param device 연결할 장치 정보
   * @param isFirst 첫 연결인지 여부
   */
  private async connect_promise(device: DeviceBase, isFirst: boolean = false): Promise<boolean> {

    console.log('DeviceInfoProvider.connect_promise', device, isFirst);

    return new Promise<boolean>((res, rej) => {
      // 장치 연결
      this.ble.connect(device.id)
          .subscribe(
              // 연결 성공
              async (peripheral) => {

                // console.log('connect ble callback', peripheral);

                // 일반 연결 콜백 함수 호출
                res(await this.generalConnectPostCallback(device, isFirst));
              },
              // 연결 에러 (연결해제 콜백)
              async (peripheral) => {

                console.log('disconnect callback from connect_promise');

                // 연결해제 상태로 저장
                device.setStaticStatus(EnumDeviceStaticStatus.NotConnected);

                res(false);
              }
          );
    })
  }

  /**
   * 일반 연결 콜백 함수
   * @param device 연결할 장치 정보
   * @param isFirst 첫 연결인지 여부
   */
  async generalConnectPostCallback(device: DeviceBase, isFirst: boolean) {

    console.log('DeviceInfoProvider.generalConnectPostCallback', device, isFirst);

    // 연결 콜백 함수 호출
    const result = await this.connect_callback(device, isFirst);

    // 연결 성공 이고, 연결 후 자동 싱크인 경우
    if (result && device.config.autoSyncAfterConnection) {
      this.syncDevice(device);
    }

    return result;
  }

  /**
   * 연결 콜백 함수
   * @param device 해당 장치 정보
   * @param isFirst 첫번째 연결인지 여부
   */
  private async connect_callback(device: DeviceBase, isFirst: boolean): Promise<boolean> {

    console.log('DeviceInfoProvider.connect_callback', device, isFirst);

    let result: boolean = false;

    // 연결이 유휴 상태가 아닌 경우
    if (!device.isInDynamicStatus(EnumDeviceDynamicStatus.Idle)) {

      console.log(`You cannot connect device. Device dynamic status is not Idle`);

    }
    // 연결이 유휴 상태인 경우
    else {
      // 연결 중 상태로 변경
      device.setDynamicStatus(EnumDeviceDynamicStatus.Connecting);

      // this.connectedDevicesObservable.next(this.connectedDevices);
      // 첫 연결인 경우
      if (isFirst) {
        // 첫번째 연결 콜백 호출
        result = await device.first_connect_callback();
      }
      // 첫 연결이 아닌 경우
      else {
        // 반복 연결 콜백 호출
        result = await device.repeated_connect_callback();
      }
      // 유휴 상태로 설정
      device.setDynamicStatus(EnumDeviceDynamicStatus.Idle);

      // 연결이 실패인 경우
      if (!result) {
        // 장치 연결 해제
        await this.ble.disconnect(device.id);
      }
      // 연결이 성공인 경우
      else {
        // 연결됨 상태로 설정
        device.setStaticStatus(EnumDeviceStaticStatus.Connected);
      }
    }

    return result;
  }

  /**
   * 자동 재연결
   * @param device 장치 정보
   */
  async autoConnect(device: DeviceBase) {

    console.log('DeviceInfoProvider.autoConnect', device);

    // 등록된 장치가 아닌 경우
    if (!this.isDeviceBonded(device)) {
      console.log('Device is not bonded. ignore autoconnect');
    }
    // 연결되지 않은 상태가 아닌 경우
    else if (!device.isInStaticStatus(EnumDeviceStaticStatus.NotConnected)) {
      console.log('Device is not NotConnected. Do not autoconnect');
    }
    // 유휴 상태가 아닌 경우
    else if (!device.isInDynamicStatus(EnumDeviceDynamicStatus.Idle)) {
      console.log('Device is not Idle. Do not autoconnect');
    }
    // 그 외
    else {

      console.log('Starts Autoconnect!');

      // 자동 연결로 상태 설정
      device.setStaticStatus(EnumDeviceStaticStatus.Autoconnecting);

      // 자동 연결
      this.ble.autoConnect(device.id,
          () => {
            // this.connect_callback(device);
            // device.setDynamicStatus(EnumDeviceDynamicStatus.Connecting);
            // 일반 연결 콜백 함수 호출
            this.generalConnectPostCallback(device, false);
          },
          () => {
            device.setStaticStatus(EnumDeviceStaticStatus.NotConnected);
            device.setDynamicStatus(EnumDeviceDynamicStatus.Idle);
            console.log('disconnect callback after auto-connect')
          }
      )
    }
  }

  /**
   * 장치 연결 해제
   * @param device 연결 해제할 장치 정보
   */
  public async disconnectDevice(device: DeviceBase): Promise<boolean> {

    console.log('DeviceInfoProvider.disconnectDevice', device);

    let result: boolean = false;

    // 등록된 장치인 경우
    if (this.isDeviceBonded(device)) {

      try {

        console.log('force disconnect from disconnectDevice');

        // 연결 해제
        await this.ble.disconnect(device.id);

        // 연결 해제 상태로 설정
        device.setStaticStatus(EnumDeviceStaticStatus.NotConnected);

        result = true;
      } catch (error) {
        console.error(error);
      }
      finally {

      }
    }

    return result;
  }

  /**
   * 장치 등록 해제
   * @param device 등록 해제 할 장치 정보
   */
  public async debondDevice(device: DeviceBase) {

    console.log('DeviceInfoProvider.debondDevice', device);

    // 장치 연결 해제
    await this.disconnectDevice(device);

    // 장치 등록 해제
    this.removeDevice(device);
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

    for (const devicetype of devicetypeList) {
      // console.log(devicetype, storageData[devicetype]);
      for (const d of storageData[devicetype]) {
        const dis = storageData[devicetype][d];
        // console.log('looking for devicetype:', devicetype, dis);

        const constructors = deviceList[devicetype];

        for (const cs of constructors) {
          const tclass = new cs(this, '', '');
          // console.log(tclass);
          if (tclass.class_name === dis.class_name) {
            ncds[devicetype].push(new cs(this.cordovaServices[devicetype], dis.id, dis.name, dis.extra ? JSON.parse(dis.extra) : {}));
          }
        }
      }
      // const dis: DeviceInStorage = sd[devicetype];

    }
    return ncds;
  }

}
