const moneyFields = ['revenue', 'operatingIncome', 'netIncome', 'operatingCash', 'freeCashFlow', 'capex', 'debt', 'cash', 'equity', 'receivables', 'inventory', 'eps'];
const scales = {trillion:1e12,tn:1e12,billion:1e9,bn:1e9,million:1e6,mn:1e6,crore:1e7,crores:1e7,lakh:1e5,lakhs:1e5};
const validNumber = v => typeof v === 'number' && Number.isFinite(v);

// Supply ready-to-quote amounts. The model must not perform currency/unit conversion.
export function narrativeFinancials(evidence) {
  const currency=evidence.financialCurrency||'currency unspecified';
  const amount=v=>!validNumber(v)?null:Math.abs(v)>=1e9?`${currency} ${(v/1e9).toFixed(2)} billion`:`${currency} ${v.toFixed(2)}`;
  const rows=series=>(series||[]).map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,moneyFields.includes(k)?amount(v):v])));
  return {annual:rows(evidence.annual),quarterly:rows(evidence.quarterly),observations:(evidence.observations||[]).map(o=>o.id==='free-cash-flow'?{...o,value:amount(o.value)}:o)};
}

// This narrowly checks monetary claims in the provider-based financial-health
// section. It does not claim to verify ratios, periods, or external issuer facts.
export function financialAmountIssues(text,evidence) {
  const values=[...(evidence?.annual||[]),...(evidence?.quarterly||[])].flatMap(row=>moneyFields.map(k=>row[k]).filter(validNumber));
  const issues=[];
  const pattern=/(₹|INR|USD|\$|Rs\.?)\s*([−-]?\d[\d,]*(?:\.\d+)?)\s*(trillion|billion|million|crores?|lakhs?|tn|bn|mn)?\b/gi;
  for(const match of (text||'').matchAll(pattern)){
    const currency=/^(₹|INR|Rs)/i.test(match[1])?'INR':'USD';
    const numeric=match[2].replaceAll(',','').replace('−','-'),scale=scales[match[3]?.toLowerCase()]||1;
    const value=Number(numeric)*scale,decimals=numeric.split('.')[1]?.length||0;
    const tolerance=Math.max(scale*0.5/10**decimals,Math.abs(value)*0.001);
    if(currency!==evidence?.financialCurrency||!values.some(v=>Math.abs(v-value)<=tolerance))issues.push(match[0].trim());
  }
  return issues;
}
