import { Injectable } from '@angular/core';
import { CordovaBodyscaleService } from './cordova-bodyscale.service';
import { Qnscale } from 'ionic-native-qnscale/ngx';
import { BodyscaleMeasurement } from 'autochek-base/objects/device-data-object';




@Injectable()
export class DeviceBodyscaleDual {


  constructor(
      private cordovaBodyscaleService: CordovaBodyscaleService,
      private qnscale: Qnscale
  ) {

  }

  async measureStart(height: number, gender: 'male'|'female', year: number, month: number, date: number): Promise<void>{
    console.log("Dual measure start");
    try{
      let res: any = await this.qnscale.connectQnscale(height, gender, year, month, date);
      console.log("Dual plugin call done");
      if (typeof(res) === 'string') {
        res = JSON.parse(res);
      }
      const measr = res;

      const bmi = new BodyscaleMeasurement();
      bmi.weight = measr.weight;
      bmi.fat = measr['body fat rate'];
      bmi.water = measr['body water rate'];
      bmi.muscle = measr['muscle rate'];
      bmi.bmr = measr.BMR;
      bmi.visceral = measr['visceral fat'];
      bmi.bone = measr['bone mass'];
      bmi.bmi = measr.BMI;

      await this.cordovaBodyscaleService.putBodyscaleMeasurement(bmi);
      return;

    }catch (error){
      console.error(error);
    }
    return;
  }


}

// public async yolanda() {
//   const userInfo = this.backendProvider.getUserInfo();
//   let birth: Date;
//   if (userInfo.birth instanceof firebase.firestore.Timestamp) {
//     birth = userInfo.birth.toDate();
//   } else {
//     birth = userInfo.birth;
//   }



//   const modal = await this.modalController.create({
//     component: YolandaPage,
//   });

//   await modal.present();


//   try{
//     console.log("yolanda starts")
//     const res = await this.qnscale.connectQnscale(userInfo.height, userInfo.gender, birth.getFullYear(), birth.getMonth(), birth.getDate());
//     console.log(res);
//     const measr = JSON.parse(res);
//     console.log(measr);

//     const bmi = new BodyscaleMeasurement();
//     bmi.weight = measr.weight;
//     bmi.fat = measr['body fat rate'];
//     bmi.water = measr['body water rate'];
//     bmi.muscle = measr['muscle rate'];
//     bmi.bmr = measr.BMR;
//     bmi.visceral = measr['visceral fat'];
//     bmi.bone = measr['bone mass'];
//     bmi.bmi = measr.BMI;
//     console.log(bmi);

//     this.cordovaBodyscaleService.putBodyscaleMeasurement(bmi);

//   }catch(err) {
//     console.error("Yolanda fail - ", err);
//   } finally{
//     modal.dismiss();
//   }



//   // console.log(res);
//   // console.log(JSON.parse(res));
// }
