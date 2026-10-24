export const DAILY_WATER_LITRES=3;
export function calculateWaterStock({people,days,stock}){
 const p=String(people??'').trim(),d=String(days??'').trim(),s=String(stock??'').trim(),errors={};
 if(!/^\d+$/.test(p)||Number(p)<1||Number(p)>100)errors.people='人数は1〜100人の整数で入力してください。';
 if(!['3','7'].includes(d))errors.days='備える日数は3日分または7日分を選んでください。';
 if(s!==''&&(!/^\d+(?:\.\d)?$/.test(s)||Number(s)>100000))errors.stock='備蓄量は0〜100,000L、小数第1位までで入力してください。';
 if(Object.keys(errors).length)return {ok:false,errors};
 const required=Number(p)*Number(d)*DAILY_WATER_LITRES;
 // Decimal litres are converted to integer tenths to avoid bottle-rounding errors.
 const stockTenths=s===''?null:Math.round(Number(s)*10),shortageTenths=stockTenths===null?null:Math.max(0,required*10-stockTenths);
 return {ok:true,people:Number(p),days:Number(d),required,requiredBottles:Math.ceil(required/2),stock:stockTenths===null?null:stockTenths/10,shortage:shortageTenths===null?null:shortageTenths/10,extraBottles:shortageTenths===null?null:Math.ceil(shortageTenths/20)};
}
