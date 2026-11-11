import { searchProfile } from './profile-search.js';
const form=document.getElementById('profile-ask-form');
if(form){
    const input=form.querySelector('textarea'), submit=form.querySelector('[type="submit"]');
    const status=document.getElementById('ask-status'), mode=document.getElementById('ask-mode');
    const panel=document.getElementById('ask-result'), answer=document.getElementById('ask-answer');
    const links=document.getElementById('ask-sources'), chips=[...document.querySelectorAll('[data-ask-question]')];
    const stop=document.getElementById('ask-stop');
    let records=null, endpoint='', controller=null, busy=false;
    const ready=Promise.all([
        fetch('data/search-index.json').then(r=>{if(!r.ok)throw new Error('index');return r.json();}).then(data=>{records=data.records;}),
        fetch('data/assistant-config.json').then(r=>r.ok?r.json():{}).then(config=>{
            if(config.endpoint){const url=new URL(config.endpoint);if(url.protocol==='https:')endpoint=url.href;}
        }).catch(()=>{})
    ]).then(()=>{mode.textContent=endpoint?'AI answers · DeepSeek':'Website search';}).catch(()=>{mode.textContent='Profile explorer';});
    function sources(items){
        links.replaceChildren();
        for(const item of items.slice(0,4)){
            if(!/^[a-z-]+\.html$/.test(item.page))continue;
            const a=document.createElement('a');a.href=item.page;a.className='ask-source';
            const title=document.createElement('strong');title.textContent=item.title;
            const detail=document.createElement('span');detail.textContent=item.text?item.text.slice(0,220)+(item.text.length>220?'…':''):'Read the supporting section ↗';
            a.append(title,detail);links.append(a);
        }
    }
    function setBusy(value){busy=value;submit.disabled=value;input.readOnly=value;chips.forEach(chip=>chip.disabled=value);stop.hidden=!value;form.setAttribute('aria-busy',String(value));submit.querySelector('span').textContent=value?'Searching…':'Ask my profile';}
    chips.forEach(chip=>chip.addEventListener('click',()=>{input.value=chip.dataset.askQuestion;form.requestSubmit();}));
    stop.addEventListener('click',()=>controller?.abort());
    form.addEventListener('submit',async event=>{
        event.preventDefault();if(busy)return;
        const question=input.value.trim();
        if(question.length<3){status.textContent='Please enter a question with at least three characters.';input.focus();return;}
        setBusy(true);controller=new AbortController();
        panel.hidden=false;answer.textContent='';links.replaceChildren();
        status.textContent='Looking through the published profile…';
        let timer;
        try{
            await ready;
            if(!Array.isArray(records))throw new Error('index');
            if(controller.signal.aborted)throw new DOMException('Stopped','AbortError');
            const results=searchProfile(question,records,6);sources(results);
            if(!results.length){answer.textContent='I couldn’t find that information in the published profile. Try asking about research, education, projects, teaching, or certifications.';status.textContent='No matching website information found.';return;}
            answer.textContent='These website entries may help answer your question. Open a result to explore the full details.';
            if(!endpoint){status.textContent='Website results · AI answers are not connected yet.';return;}
            status.textContent='Preparing an answer from the website evidence…';
            timer=setTimeout(()=>controller.abort(),35000);
            const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question}),signal:controller.signal,credentials:'omit'});
            const data=await response.json();
            if(!response.ok)throw new Error(response.status===429?'rate':'api');
            if(typeof data.answer!=='string'||!Array.isArray(data.sources))throw new Error('api');
            answer.textContent=data.answer;
            if(data.sources.length)sources(data.sources);
            status.textContent=data.mode==='ai'?'AI-generated answer · Check the linked website evidence.':'Website evidence · No supported AI answer available.';
        } catch(error){
            if(error.name==='AbortError')status.textContent='Answer stopped or timed out. Any website matches remain available below.';
            else if(error.message==='index'){answer.textContent='The profile search is temporarily unavailable. Please explore the research and experience pages.';sources([{title:'Research overview',page:'research.html'},{title:'Professional experience',page:'experience.html'}]);status.textContent='Could not load website search.';}
            else status.textContent=error.message==='rate'?'The assistant is busy. Please try again in a minute, or use the website results.':'AI is temporarily unavailable. You can still explore the website results.';
        } finally{clearTimeout(timer);setBusy(false);}
    });
}
