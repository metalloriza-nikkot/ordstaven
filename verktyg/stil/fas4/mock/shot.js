const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:960}});
for(const v of ['forsta','fortsatt','tva','nytt','paus','vuxen']){await p.goto('file://'+__dirname+'/skiss.html?vy='+v);await p.waitForTimeout(500);await p.screenshot({path:'/tmp/skiss_'+v+'.png'});}
await b.close();})();
