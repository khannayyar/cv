// Load jsPDF library dynamically
function loadJsPDF() {
    return new Promise((resolve, reject) => {
        if (window.jspdf) {
            resolve(window.jspdf);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => resolve(window.jspdf);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Selectable-text A4 CV. Application mode curates long lists; full mode keeps them.
async function exportToPDF(mode = 'application') {
    if (exportToPDF.busy) return;
    exportToPDF.busy = true;
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    overlay.setAttribute('role', 'status');
    overlay.innerHTML = '<div class="bg-white rounded-lg p-8 text-center">Preparing your CV…</div>';
    document.body.appendChild(overlay);
    try {
        const names = ['personal-info','education','experience','research','projects','certifications','patents','skills','awards','teaching','professional-profile','case-studies','community','books'];
        const data = await Promise.all(names.map(async name => {
            const response = await fetch(`data/${name}.json`);
            if (!response.ok) throw new Error(`Unable to load ${name}`);
            return CVDateOrder.sortData(await response.json());
        }));
        const [person,education,experience,research,projects,credentials,patents,skills,awards,teaching,profile,cases,community,books] = data;
        const full = mode === 'full';
        const {jsPDF} = await loadJsPDF();
        const doc = new jsPDF({unit:'mm',format:'a4',compress:true});
        doc.setProperties({title:`${person.name} | ${full?'Academic CV':'Application CV'}`,author:person.name,subject:person.researchHeadline,keywords:'Computer Science, AI, Healthcare, Blockchain, Curriculum Vitae'});
        const navy=[16,42,76], blue=[32,86,160], grey=[83,96,114];
        const left=19, width=172, bottom=275;
        let y=22, sectionName='';
        // Standard PDF fonts keep the document searchable and portable.
        const clean=value=>String(value??'').replace(/<[^>]*>/g,'').replace(/[–—−]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\u00a0/g,' ').replace(/[^\x20-\x7e\n\xA0-\xFF]/g,'');
        function font(size=10,weight='normal',color=navy){doc.setFont('helvetica',weight);doc.setFontSize(size);doc.setTextColor(...color);}
        function rule(at){doc.setDrawColor(220,226,234);doc.setLineWidth(.25);doc.line(left,at,191,at);}
        function newPage(){doc.addPage();y=25;font(8,'bold',grey);doc.text(clean(person.name),left,15);font(8,'normal',grey);doc.text(clean(sectionName),191,15,{align:'right'});rule(19);}
        function ensure(height){if(y+height>bottom)newPage();}
        function lines(text,size=10,indent=0,weight='normal'){font(size,weight);return doc.splitTextToSize(clean(text),width-indent);}
        function paragraph(text,{size=10,color=navy,weight='normal',indent=0,gap=2}={}){
            const wrapped=lines(text,size,indent,weight), step=size*.47;
            ensure(Math.min(wrapped.length*step+gap,240));
            for(const line of wrapped){ensure(step);font(size,weight,color);doc.text(line,left+indent,y);y+=step;}
            y+=gap;
        }
        function section(title){sectionName=title;ensure(23);y+=5;font(10,'bold',blue);doc.text(clean(title.toUpperCase()),left,y);y+=3;rule(y);y+=7;}
        function entry(title,meta,body='',url=''){
            const titleLines=lines(title,11,0,'bold'),metaLines=lines(meta,9);
            const height=titleLines.length*5.2+metaLines.length*4.3+(body?lines(body,9.8).length*4.606+2:0)+(url?5:0)+8;
            ensure(Math.min(height,240));
            paragraph(title,{size:11,weight:'bold',gap:1});
            if(meta)paragraph(meta,{size:9,color:grey,gap:2});
            if(body)paragraph(body,{size:9.8,gap:2});
            if(/^https?:\/\//.test(url)){ensure(5);font(8.5,'normal',blue);doc.textWithLink('View supporting record',left,y,{url});y+=5;}
            y+=3;
        }
        function bullet(text){paragraph('- '+text,{size:9.8,indent:2,gap:1.5});}
        // Quiet, print-friendly header with a restrained US-inspired accent.
        doc.setFillColor(...navy);doc.rect(left,12,22,1.2,'F');doc.setFillColor(179,41,61);doc.rect(left+24,12,6,1.2,'F');
        paragraph(person.name,{size:25,weight:'bold',gap:3});
        paragraph(person.title+' | '+person.university,{size:12,color:blue,gap:2});
        paragraph(person.researchHeadline,{size:10,color:grey,gap:3});
        paragraph([person.email,person.phone,'Shaqra, Saudi Arabia'].filter(Boolean).join('  |  '),{size:9,color:grey,gap:1});
        paragraph(person.website,{size:9,color:blue,gap:3});
        section('Professional profile');
        paragraph(full?person.bio:person.bio.split(/(?<=\.)\s+/).slice(0,4).join(' '));
        section('Professional experience');
        for(const job of experience.positions){
            entry(job.title,[job.institution,job.duration,job.location].filter(Boolean).join(' | '),job.description);
            if(full)for(const item of job.responsibilities||[])bullet(item);
        }
        section('Education');
        for(const degree of education.degrees)entry(degree.degree,[degree.institution,degree.year].filter(Boolean).join(' | '),degree.specialization?`Specialization: ${degree.specialization}`:'');
        section('Research and technical expertise');
        const selectedSkills=full?skills.categories:skills.categories.filter(item=>/AI & Machine|Programming &|AI\/ML Frameworks|Cybersecurity|Research Applications/.test(item.name));
        for(const category of selectedSkills)entry(category.name,'',category.skills.join(' · '));
        section(full?'Research projects':'Selected research projects');
        if(full){for(const project of projects.projects)entry(project.title,[project.role,project.duration].filter(Boolean).join(' | '),project.description,project.link);}
        else for(const study of cases.caseStudies){
            const project=projects.projects.find(item=>item.title===study.projectTitle)||{};
            entry(study.title,[project.role,project.duration].filter(Boolean).join(' | '),study.contribution+' '+study.outcome,project.link);
        }
        section(full?'Publications':'Selected recent publications');
        const publications=full?research.publications:research.publications.slice(0,6);
        if(!full)paragraph('Six most recent publications from the website record. The complete publication list is available in the online CV.',{size:9,color:grey});
        for(const pub of publications)entry(pub.title,[pub.authors,pub.journal||pub.venue,pub.year].filter(Boolean).join(' | '),'',pub.url||pub.link);
        section('Teaching and academic leadership');
        const courses=[...new Set(teaching.years.flatMap(year=>year.courses.map(course=>course.title)))];
        paragraph((full?'Courses taught: ':'Selected courses taught: ')+(full?courses:courses.slice(0,12)).join('; ')+'.');
        if(full){for(const role of credentials.featuredRoles)entry(role.role,role.organization,role.description);}
        else paragraph('Training and academy roles: '+credentials.featuredRoles.map(role=>role.role).join('; ')+'.',{size:9.5});
        section(full?'Professional credentials':'Selected professional credentials');
        for(const cert of (full?credentials.certifications:credentials.certifications.slice(0,6))){
            if(full)entry(cert.name,[cert.issuer,cert.year].filter(Boolean).join(' | '));
            else bullet([cert.name,cert.issuer,cert.year].filter(Boolean).join(' | '));
        }
        if(patents.patents.length){section(full?'Patents':'Selected patents');for(const patent of (full?patents.patents:patents.patents.slice(0,3))){const meta=[patent.patentNumber,patent.country,patent.status,patent.grantDate||patent.filingDate].filter(Boolean).join(' | ');if(full)entry(patent.title,meta);else bullet(patent.title+' | '+meta);}}
        if(awards.awards.length){section(full?'Honours and recognition':'Selected honours and recognition');for(const award of (full?awards.awards:awards.awards.slice(0,3))){const meta=[award.issuer,award.date].filter(Boolean).join(' | ');if(full)entry(award.title,meta,award.description);else bullet(award.title+' | '+meta);}}
        if(full){
            for(const [title,items] of [['Academic service',profile.service],['Professional affiliations',profile.affiliations],['Community contributions',community.contributions],['Books',books.books]]){
                if(items?.length){section(title);for(const item of items)entry(item.title||item.name,[item.role,item.organization,item.date].filter(Boolean).join(' | '),item.description||'');}
            }
        }
        if(profile.languages.length){section('Languages');paragraph(profile.languages.map(item=>`${item.name} (${item.proficiency})`).join('; '),{size:9.5});}
        const total=doc.getNumberOfPages();
        for(let page=1;page<=total;page++){
            doc.setPage(page);rule(282);font(8,'normal',grey);
            doc.text(full?'ACADEMIC CURRICULUM VITAE':'APPLICATION CURRICULUM VITAE',left,288);
            doc.text(`${page} / ${total}`,191,288,{align:'right'});
        }
        doc.save(`${person.name.replace(/\s+/g,'_')}_${full?'Academic':'Application'}_CV.pdf`);
    }catch(error){console.error('Error generating PDF:',error);alert('The CV could not be generated. Please check your connection and try again.');}
    finally{overlay.remove();exportToPDF.busy=false;}
}

// Export CV to LaTeX
// Escape source content so titles, URLs, and affiliations remain valid LaTeX.
function escapeLaTeXData(value) {
    if (typeof value === 'string') {
        const replacements = {'\\':'\\textbackslash{}','&':'\\&','%':'\\%','$':'\\$','#':'\\#','_':'\\_','{':'\\{','}':'\\}','~':'\\textasciitilde{}','^':'\\textasciicircum{}'};
        return value.replace(/[\\&%$#_{}~^]/g, char => replacements[char]);
    }
    if (Array.isArray(value)) return value.map(escapeLaTeXData);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, escapeLaTeXData(item)]));
    return value;
}

async function exportToLaTeX() {
    try {
        // Load data
        async function safeFetch(url, fallback) {
            try {
                const res = await fetch(url);
                if (!res.ok) return fallback;
                return escapeLaTeXData(CVDateOrder.sortData(await res.json()));
            } catch (e) {
                return fallback;
            }
        }

        const personalInfo = await safeFetch('data/personal-info.json', { name: 'Name', title: '', address: '', phone: '', email: '', website: '', socialMedia: { linkedin: '', github: '' }, bio: '', researchInterests: [] });
        const education = await safeFetch('data/education.json', { degrees: [] });
        const experience = await safeFetch('data/experience.json', { positions: [] });
        const research = await safeFetch('data/research.json', { publications: [] });
        const projects = await safeFetch('data/projects.json', { projects: [] });
    const certifications = await safeFetch('data/certifications.json', { featuredRoles: [], certifications: [] });
        const patents = await safeFetch('data/patents.json', { patents: [] });
        const books = await safeFetch('data/books.json', { books: [] });
        const skills = await safeFetch('data/skills.json', { categories: [] });
        const awards = await safeFetch('data/awards.json', { awards: [] });
    const community = await safeFetch('data/community.json', { contributions: [] });
        const teaching = await safeFetch('data/teaching.json', { years: [], statistics: {} });
        const professionalProfile = await safeFetch('data/professional-profile.json', { languages: [], service: [], affiliations: [] });
        const researchPhilosophy = await safeFetch('data/research_philosophy.json', { summary: '', pillars: [] });

        // Generate LaTeX content
        let latex = `\\documentclass[11pt,a4paper,sans]{moderncv}

% ModernCV theme
\\moderncvstyle{banking}
\\moderncvcolor{blue}

% Character encoding
\\usepackage[utf8]{inputenc}

% Adjust page margins
\\usepackage[scale=0.85]{geometry}

% Personal data
\\name{${personalInfo.name.split(' ')[0]}}{${personalInfo.name.split(' ').slice(1).join(' ')}}
\\title{${personalInfo.title}}
\\address{${personalInfo.address}}{}{}
\\phone[mobile]{${personalInfo.phone}}
\\email{${personalInfo.email}}
\\homepage{${personalInfo.website}}
\\social[linkedin]{${personalInfo.socialMedia.linkedin}}
\\social[github]{${personalInfo.socialMedia.github || ''}}

\\begin{document}

\\makecvtitle

% Professional Summary
\\section{Professional Summary}
${personalInfo.bio || (personalInfo.professionalExpertise || []).join('. ')}

% Research Interests
\\section{Research Interests}
\\begin{itemize}
${personalInfo.researchInterests.map(interest => `  \\item ${interest}`).join('\n')}
\\end{itemize}

`;

        // Research Philosophy
        if (researchPhilosophy.summary || (researchPhilosophy.pillars && researchPhilosophy.pillars.length > 0)) {
            latex += `\\section{Research Philosophy}\n`;
            if (researchPhilosophy.summary) {
                latex += `${researchPhilosophy.summary}\n\n`;
            }
            if (researchPhilosophy.pillars && researchPhilosophy.pillars.length > 0) {
                latex += `\\begin{itemize}\n`;
                researchPhilosophy.pillars.forEach(pillar => {
                    const title = pillar.title || pillar.name || '';
                    const desc = pillar.description || pillar.text || '';
                    if (title) {
                        latex += `  \\item \\textbf{${title}}`;
                        if (desc) {
                            latex += `: ${desc}`;
                        }
                        latex += `\n`;
                    }
                });
                latex += `\\end{itemize}\n\n`;
            }
        }

        // Education
        if (education.degrees && education.degrees.length > 0) {
            latex += `\\section{Education}\n`;
            education.degrees.forEach(degree => {
                latex += `\\cventry{${degree.year}}{${degree.degree}}{${degree.institution}}{}{}{${degree.specialization || ''}}\n`;
            });
            latex += '\n';
        }

        // Experience
        if (experience.positions && experience.positions.length > 0) {
            latex += `\\section{Professional Experience}\n`;
            experience.positions.forEach(position => {
                latex += `\\cventry{${position.duration}}{${position.title}}{${position.institution}}{}{}{${position.description || ''}}\n`;
            });
            latex += '\n';
        }

        // Publications
        if (research.publications && research.publications.length > 0) {
            latex += `\\section{Publications}\n\\begin{enumerate}\n`;
            
            // Sort publications by year (latest first)
            const sortedPubs = [...research.publications].sort((a, b) => {
                const yearA = parseInt(a.year) || 0;
                const yearB = parseInt(b.year) || 0;
                return yearB - yearA;
            });
            
            sortedPubs.forEach(pub => {
                latex += `  \\item ${pub.authors}. ${pub.title}. \\textit{${pub.journal}}, ${pub.year}. Citations: ${pub.citations}.\n`;
            });
            latex += '\\end{enumerate}\n\n';
        }

        // Projects
        if (projects.projects && projects.projects.length > 0) {
            latex += `\\section{Research Projects}\n`;
            projects.projects.forEach(project => {
                latex += `\\cventry{${project.duration || ''}}{${project.title}}{${project.role || ''}}{}{}{${project.description || ''}}\n`;
            });
            latex += '\n';
        }

        // Patents
        if (patents.patents && patents.patents.length > 0) {
            latex += `\\section{Patents}\n\\begin{enumerate}\n`;
            patents.patents.forEach(patent => {
                latex += `  \\item ${patent.title}. Patent No: ${patent.patentNumber}, ${patent.year}.\n`;
            });
            latex += '\\end{enumerate}\n\n';
        }

        // Books
        if (books.books && books.books.length > 0) {
            latex += `\\section{Books}\n\\begin{enumerate}\n`;
            books.books.forEach(book => {
                latex += `  \\item ${book.authors}. \\textit{${book.title}}. ${book.publisher}, ${book.year}.\n`;
            });
            latex += '\\end{enumerate}\n\n';
        }

        // Professional Certifications \\& Trainer Roles
        if ((certifications.featuredRoles && certifications.featuredRoles.length) || (personalInfo.trainerHighlights && personalInfo.trainerHighlights.length)) {
            latex += `\\section{Professional Certifications \\& Trainer Roles}\n\\begin{itemize}\n`;
            if (certifications.featuredRoles && certifications.featuredRoles.length) {
                certifications.featuredRoles.forEach(r => {
                    const detail = [r.organization, r.years].filter(Boolean).join(' | ');
                    latex += `  \\item ${r.role}${detail ? ' (' + detail + ')' : ''}${r.description ? ': ' + r.description : ''}\n`;
                });
            } else if (personalInfo.trainerHighlights) {
                personalInfo.trainerHighlights.forEach(t => {
                    latex += `  \\item ${t}\n`;
                });
            }
            latex += `\\end{itemize}\n\n`;
        }

        // Certifications (non-featured list if present)
        if (certifications.certifications && certifications.certifications.length > 0) {
            latex += `\\section{Additional Certifications}\n`;
            certifications.certifications.forEach(cert => {
                latex += `\\cventry{${cert.year || ''}}{${cert.name}}{${cert.issuer}}{}{}{}\n`;
            });
            latex += '\n';
        }

        // Teaching
        if (teaching.years && teaching.years.length > 0) {
            const totalCourses = teaching.statistics?.totalCourses || 0;
            const yearsTaught = teaching.statistics?.yearsTaught || teaching.years.length;
            latex += `\\section{Teaching Experience}\n`;
            latex += `\\textit{${totalCourses} courses taught across ${yearsTaught} academic years}\n\n`;
            teaching.years.forEach(yearGroup => {
                latex += `\\cventry{${yearGroup.academicYear}}{}{}{}{}{\n`;
                if (yearGroup.courses && yearGroup.courses.length > 0) {
                    latex += `  \\begin{itemize}\n`;
                    yearGroup.courses.forEach(course => {
                        const courseText = `${course.title}${course.level ? ' (' + course.level + ')' : ''}`;
                        latex += `    \\item ${courseText}\n`;
                    });
                    latex += `  \\end{itemize}\n`;
                }
                latex += `}\n`;
            });
            latex += '\n';
        }

        // Skills
        if (skills.categories && skills.categories.length > 0) {
            latex += `\\section{Skills}\n`;
            skills.categories.forEach(category => {
                latex += `\\cvitem{${category.name}}{${category.skills.join(', ')}}\n`;
            });
            latex += '\n';
        }

        // Awards
        if (awards.awards && awards.awards.length > 0) {
            latex += `\\section{Awards \\& Honors}\n\\begin{itemize}\n`;
            awards.awards.forEach(award => {
                latex += `  \\item ${award.title}, ${award.date || award.year || 'N/A'}\n`;
            });
            latex += '\\end{itemize}\n\n';
        }

        // Community Contributions
        if (community.contributions && community.contributions.length > 0) {
            latex += `\\section{Community Contributions}\n\\begin{itemize}\n`;
            community.contributions.forEach(item => {
                const line = `${item.title} (${item.type}${item.date ? ', ' + item.date : ''})${item.organization ? ' -- ' + item.organization : ''}${item.description ? '. ' + item.description : ''}`;
                latex += `  \\item ${line}\n`;
            });
            latex += '\\end{itemize}\n\n';
        }

        for (const [heading, entries] of [
            ['Languages', (professionalProfile.languages || []).map(item => `${item.name}: ${item.proficiency}`)],
            ['Professional Service', (professionalProfile.service || []).map(item => `${item.title} | ${item.organization || ''} | ${item.date || 'Date not listed'}`)]
        ]) {
            if (!entries.length) continue;
            latex += `\\section{${heading}}\n\\begin{itemize}\n`;
            entries.forEach(entry => { latex += `  \\item ${entry}\n`; });
            latex += `\\end{itemize}\n`;
        }
        latex += `\\end{document}`;

        // Create and download the file
        const blob = new Blob([latex], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${personalInfo.name.replace(/\s+/g, '_')}_CV.tex`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error generating LaTeX:', error);
        alert('Error generating LaTeX file. Please try again.');
    }
}
