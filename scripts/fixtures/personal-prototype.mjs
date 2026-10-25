// Fictional legacy-shaped application: each form used to append a record.
const action = (id, label, kind, targetScreenId = '', extra = {}) => ({id,label,kind,targetScreenId,collection:'',recordId:'',field:'',value:'',message:'',...extra});
const section = (id,type,title,extra={}) => ({id,type,title,description:'',collection:'',visibility:'always',fields:[],records:[],actions:[],...extra});
const field = (id,label,type='text',extra={}) => ({id,label,type,required:true,placeholder:'',initialValue:'',options:[],...extra});
const screen = (id,name,sections,actions=[]) => ({id,name,title:name,eyebrow:'',description:'Fictional application preview.',requirementIds:[],sections,actions});
export const otherApplicants = Array.from({length:20},(_,i)=>({id:`other-${i}`,title:`Other applicant ${i+1}`,subtitle:`EXAMPLE-${i+1}`,value:`other${i+1}@example.com`,status:'Configured'}));
export const personalPrototype = {
  // No dataScope intentionally: saved legacy prototypes must be personal too.
  name:'Sample application',theme:'indigo',layout:'mobile',targetPlatform:'mobile',description:'Fictional demonstration; no real loan is requested.',startScreenId:'start',scenarios:[],
  screens:[
    screen('start','Your details',[
      section('catalogue','cards','Available products',{collection:'products',records:[{id:'product',title:'Sample personal loan',subtitle:'Fictional product',status:'Demo',value:''}]}),
      section('identity','form','About you',{collection:'applications',fields:[field('title','Full name'),field('subtitle','Application reference'),field('value','Email address','email')],actions:[action('apply','Continue','submit','terms',{collection:'applications',field:'status',value:'Started'})]})
    ]),
    screen('terms','Choose your terms',[
      section('terms-form','form','Application terms',{collection:'applications',fields:[field('amount','Requested amount','number',{min:'1',max:'10000'}),field('term','Term','select',{options:['6 months','12 months']})],actions:[action('review','Review application','submit','review',{collection:'applications',field:'status',value:'Configured'}),action('edit','Edit your details','navigate','start')]})
    ]),
    screen('review','Review your application',[
      section('details','table','Your application',{collection:'applications',records:otherApplicants}),
      section('confirmation','form','Confirm your details',{collection:'acknowledgements',fields:[field('agree','These details are correct','checkbox')],actions:[action('confirm','Submit application','submit','done',{collection:'acknowledgements'}),action('edit-terms','Edit terms','navigate','terms')]})
    ]),
    screen('done','Application submitted',[
      section('result','table','Your submitted application',{collection:'applications',records:otherApplicants})
    ],[action('reset','Start again','reset')])
  ]
};
