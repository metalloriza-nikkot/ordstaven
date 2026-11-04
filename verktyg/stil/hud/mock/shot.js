const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});
for(const [n,q] of [['mock_mitten',''],['mock_vid_mat','?stor=MAT']]){await p.goto('file://'+__dirname+'/mock.html'+q);await p.waitForTimeout(600);await p.screenshot({path:n+'.png'});}
await b.close();})();
