const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();
for(const n of ['lista','stampel','lappen']){
 const p=await b.newPage({viewport:{width:1900,height:900}});await p.goto('file://'+__dirname+'/mock2.html?vy='+n);await p.waitForTimeout(700);await p.screenshot({path:'skiss5c_'+n+'.png'});await p.close();}
await b.close();})();
