// Read the frame header without decoding pixels or adding an image dependency to CI.
export function jpegDimensions(bytes){
 if(bytes.length<4||bytes[0]!==0xff||bytes[1]!==0xd8)throw Error('Invalid JPEG signature');
 let offset=2;
 while(offset<bytes.length){
  if(bytes[offset++]!==0xff)throw Error('Invalid JPEG marker');
  while(offset<bytes.length&&bytes[offset]===0xff)offset++;
  if(offset>=bytes.length)break;
  const marker=bytes[offset++];
  if(marker===0xda||marker===0xd9)break;
  if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
  if(marker===0x00||marker===0xd8)throw Error('Invalid JPEG marker');
  if(offset+2>bytes.length)throw Error('Truncated JPEG segment');
  const length=bytes.readUInt16BE(offset),end=offset+length;
  if(length<2||end>bytes.length)throw Error('Invalid JPEG segment length');
  // All SOF markers carry dimensions; C4, C8 and CC are other marker types.
  if(marker>=0xc0&&marker<=0xcf&&![0xc4,0xc8,0xcc].includes(marker)){
   if(length<8)throw Error('Invalid JPEG frame header');
   const height=bytes.readUInt16BE(offset+3),width=bytes.readUInt16BE(offset+5);
   const components=bytes[offset+7];
   if(!width||!height||!components||length!==8+3*components)throw Error('Invalid JPEG frame header');
   return {width,height};
  }
  offset=end;
 }
 throw Error('Missing JPEG frame header');
}
