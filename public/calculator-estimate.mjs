// These rates belong to the calculator; service and marketing prices stay separate.
export const CALCULATOR_RATES = Object.freeze({
 walls:Object.freeze({pvc:3500,laminate:4300,lining:5200,parquet:5900}),
 ceiling:Object.freeze({pvc:3500,laminate:4300,lining:5200,stretch:4500}),
 floor:Object.freeze({linoleum:7000,laminate:7500,vinyl:9000,tile:12400}),
 exterior:Object.freeze({siding:4500,metal:5800}),
 glazing:Object.freeze({cold:11000,warm:17000}),
 insulation:Object.freeze({yes:2300}),
 lighting:Object.freeze({spots:1700,pendant:4500})
});

const invalidEstimate=()=>({valid:false,total:0,items:[],areas:{walls:0,ceiling:0,floor:0,glazing:0,insulation:0,exterior:0}});
const validDimension=(value,min,max)=>['number','string'].includes(typeof value)&&Number.isInteger(Number(value))&&Number(value)>=min&&Number(value)<=max;

export function calculateFinishingEstimate(state){
 if(!state||typeof state!=='object'||Array.isArray(state)||!validDimension(state.length,100,1200)||!validDimension(state.width,50,400))return invalidEstimate();
 const L=Number(state.length)/100,W=Number(state.width)/100;
 // Preserve the arithmetic order and each line's ceil, including floating-point edges.
 const areas={
  walls:(L*2.6)+(W*2*2.6)+(L*1),
  ceiling:L*W,
  floor:L*W,
  glazing:L*1.6,
  insulation:(W*2.6)+(L*2*2.6)+(W*1),
  exterior:W
 };
 const items=[];
 for(const key of Object.keys(CALCULATOR_RATES)){
  if(state[key+'-enabled']!=='on')continue;
  const selected=state[key];
  if(key==='insulation'&&selected==='no')continue;
  if(typeof selected!=='string'||!Object.hasOwn(CALCULATOR_RATES[key],selected))return invalidEstimate();
  const rate=CALCULATOR_RATES[key][selected];
  const quantity=key==='lighting'?(selected==='spots'?L/1.5:1):areas[key];
  const unit=key==='exterior'?'пог. м':key==='lighting'?(selected==='spots'?'участок 1,5 м':'комплект'):'м²';
  items.push({key,quantity,unit,rate,amount:Math.ceil(rate*quantity)});
 }
 return {valid:true,total:Math.round(items.reduce((sum,item)=>sum+item.amount,0)),items,areas};
}
