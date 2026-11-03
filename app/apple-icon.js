import {ImageResponse} from 'next/og';
export const size={width:180,height:180};
export const contentType='image/png';
export default function Icon(){return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#a998ff'}}><svg viewBox="0 0 32 32" width="150" height="150" fill="none"><path d="M9 23 23 9M13 9h10v10M9 15v8h8" stroke="#11101a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg></div>,size)}
