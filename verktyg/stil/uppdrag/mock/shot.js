const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();
for(const [n,w,h] of [['mac',1440,900],['ipad',1180,820],['klart',1440,900],['bok',1440,900]]){
 const p=await b.newPage({viewport:{width:w+460,height:h}});await p.goto('file://'+__dirname+'/mock.html?vy='+n);await p.waitForTimeout(700);await p.screenshot({path:'uppdrag_'+n+'.png'});await p.close();}
await b.close();})();
