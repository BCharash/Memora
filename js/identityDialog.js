import {renderSaveDestination} from './sharedFolderSelection.js';

// Shared decision dialog, independent of retired audio-list persistence.
export function askIdentity({title,message,choices,signal}){
    return new Promise(resolve=>{
        const dialog=document.createElement('dialog');dialog.className='identity-dialog';
        const heading=document.createElement('h2'),body=document.createElement('p'),actions=document.createElement('div');heading.textContent=title;
        if(typeof message==='string')body.textContent=message;else renderSaveDestination(body,message);
        actions.className='identity-dialog-actions';
        let done=false;const aborted=()=>finish({action:'cancel'});const finish=value=>{if(done)return;done=true;signal?.removeEventListener('abort',aborted);if(dialog.open)dialog.close();dialog.remove();resolve(value);};
        for(const choice of choices){const button=document.createElement('button');button.type='button';button.textContent=choice.label;
            button.addEventListener('click',async()=>{button.disabled=true;try{const value=choice.run?await choice.run():undefined;finish({action:choice.action,value});}catch(error){if(error.name==='AbortError'){button.disabled=false;return;}body.textContent=error.message;button.disabled=false;}});actions.append(button);
        }
        if(signal?.aborted){finish({action:'cancel'});return;}signal?.addEventListener('abort',aborted,{once:true});
        dialog.append(heading,body,actions);dialog.addEventListener('cancel',event=>{event.preventDefault();finish({action:'cancel'});});document.body.append(dialog);dialog.showModal();actions.querySelector('button')?.focus();
    });
}
