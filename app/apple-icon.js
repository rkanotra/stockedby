import {ImageResponse} from 'next/og';
export const size={width:180,height:180};
export const contentType='image/png';
export default function Icon(){return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#f2bd72',color:'#192b42',fontSize:116,fontFamily:'sans-serif',fontWeight:700}}>s↗</div>,size)}
