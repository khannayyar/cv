import { searchProfile } from './profile-search.js';
const form=document.getElementById('profile-ask-form');
if(form){
    const input=form.querySelector('textarea'), submit=form.querySelector('[type="submit"]');
    const status=document.getElementById('ask-status');
    const panel=document.getElementById('ask-result'), answer=document.getElementById('ask-answer');
    const links=document.getElementById('ask-sources'), chips=[...document.querySelectorAll('[data-ask-question]')];
    let records=null, loading=null, busy=false;
    function loadRecords(){
        if(records)return Promise.resolve(records);
        if(!loading)loading=fetch('data/search-index.json').then(r=>{if(!r.ok)throw new Error('index');return r.json();})
            .then(data=>{if(!Array.isArray(data.records))throw new Error('index');records=data.records;return records;})
            .finally(()=>{loading=null;});
        return loading;
    }
    function sources(items){
        links.replaceChildren();
        for(const item of items.slice(0,6)){
            if(!/^[a-z-]+\.html$/.test(item.page))continue;
            const a=document.createElement('a');a.href=item.page;a.className='ask-source';
            const title=document.createElement('strong');title.textContent=item.title;
            const detail=document.createElement('span');detail.textContent=item.text?item.text.slice(0,250)+(item.text.length>250?'…':''):'Explore this section ↗';
            a.append(title,detail);links.append(a);
        }
    }
    function setBusy(value){busy=value;submit.disabled=value;chips.forEach(chip=>chip.disabled=value);form.setAttribute('aria-busy',String(value));submit.querySelector('span').textContent=value?'Searching…':'Search profile';}
    chips.forEach(chip=>chip.addEventListener('click',()=>{input.value=chip.dataset.askQuestion;form.requestSubmit();}));
    form.addEventListener('submit',async event=>{
        event.preventDefault();if(busy)return;
        const question=input.value.trim();
        if(question.length<3){status.textContent='Please enter at least three characters.';input.focus();return;}
        setBusy(true);panel.hidden=false;answer.textContent='';links.replaceChildren();status.textContent='Searching the published profile…';
        try{
            const results=searchProfile(question,await loadRecords(),6);sources(results);
            answer.textContent=results.length?'Explore these matching entries from my published profile. Open a result for full details.':'No matching information was found. Try research, education, projects, teaching, or certifications.';
            status.textContent=results.length?`${results.length} matching website ${results.length===1?'entry':'entries'}.`:'No matching website entries.';
        }catch{
            answer.textContent='Search could not load. Please explore the research and experience pages, or try searching again.';
            sources([{title:'Research overview',page:'research.html'},{title:'Professional experience',page:'experience.html'}]);
            status.textContent='Website search is temporarily unavailable.';
        }finally{setBusy(false);}
    });
}
