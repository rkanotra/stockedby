import styles from '../test/test.module.css';
const STEPS = ['Website', 'Brand', 'Market', 'Product', 'Questions'];
const PHASE_INDEX = { domain: 0, brand: 1, market: 2, category: 3, generating: 4, queries: 4 };
export default function CheckProgress({ phase }) {
  const index = PHASE_INDEX[phase];
  if(index === undefined) return null;
  return <ol className={styles.progressSteps} aria-label="Brand check steps">
    {STEPS.map((name,i)=><li key={name} aria-current={i===index?'step':undefined} className={i<index?styles.progressDone:undefined}>
      <span aria-hidden="true">{i<index?'✓':String(i+1).padStart(2,'0')}</span><span>{name}</span>
    </li>)}
  </ol>;
}
