// Separate runner: leaves the existing candidate and its test runner untouched.
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
if(!process.argv.includes('--browser')){
    const {runChecks}=await import('./labs/archive-reconciliation/checks.js');
    const result=await runChecks();console.log(result.output+`\n${result.passed}/${result.passed+result.failed.length} groups passed; ${result.skipped} browser-only groups skipped.`);
    if(result.failed.length)process.exitCode=1;
}else{
    const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');let resolveReport;
    const report=new Promise(resolve=>{resolveReport=resolve;});
    const server=createServer(async(request,response)=>{
        try{
            if(request.url==='/_reconciliation-result'&&request.method==='POST'){
                let body='';for await(const chunk of request){body+=chunk;if(body.length>100000)throw Error('Oversized report');}
                resolveReport(JSON.parse(body));response.end('ok');return;
            }
            const path=resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname));
            if(!path.startsWith(root+sep)){response.writeHead(403).end();return;}
            response.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.html')?'text/html; charset=utf-8':path.endsWith('.css')?'text/css':'application/octet-stream');response.end(await readFile(path));
        }catch{response.writeHead(404).end();}
    });
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const profile=await mkdtemp(join(tmpdir(),'memora-reconcile-lab-'));let browser,timer;
    try{
        const executable=process.env.MEMORA_TEST_BROWSER||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe');
        browser=spawn(executable,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--user-data-dir='+profile,`http://127.0.0.1:${server.address().port}/tests/archive-reconciliation.html?report=1`],{stdio:['ignore','ignore','pipe']});
        let errors='';browser.stderr.on('data',data=>{errors=(errors+data).slice(-6000);});
        const stopped=new Promise((_,reject)=>{browser.once('error',reject);browser.once('exit',code=>reject(Error('Browser exited before report: '+code+'\n'+errors)));});
        const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Reconciliation tests timed out\n'+errors)),45000);});
        const result=await Promise.race([report,stopped,timeout]);console.log(result.output+`\n${result.passed}/${result.passed+result.failed.length} groups passed; ${result.skipped} skipped.`);if(result.failed.length)process.exitCode=1;
    }finally{
        clearTimeout(timer);
        if(browser&&browser.exitCode===null){const exited=new Promise(resolve=>browser.once('exit',resolve));browser.kill();await exited;}
        server.close();
        if(dirname(profile)===resolve(tmpdir())&&profile.startsWith(join(resolve(tmpdir()),'memora-reconcile-lab-')))await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}).catch(error=>console.warn('Isolated test profile retained:',error.message));
    }
}
