const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:960}});
for(const v of ['i_1','i_2','i_3','i_4','i_5','vuxen_ljud','vuxen_pass']){await p.goto('file://'+__dirname+'/skiss2.html?vy='+v);await p.waitForTimeout(500);await p.screenshot({path:'/tmp/s3_'+v+'.png'});}
await b.close();})();
