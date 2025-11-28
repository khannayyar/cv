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

// Export CV to PDF
async function exportToPDF() {
    try {
        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        loadingDiv.innerHTML = `
            <div class="bg-white rounded-lg p-8 text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
                <p class="text-xl font-semibold">Generating PDF...</p>
            </div>
        `;
        document.body.appendChild(loadingDiv);

        // Load data
        async function safeFetch(url, fallback) {
            try {
                const res = await fetch(url);
                if (!res.ok) return fallback;
                return await res.json();
            } catch (e) {
                return fallback;
            }
        }

        const personalInfo = await safeFetch('data/personal-info.json', { name: 'Name', title: '', department: '', university: '', email: '', phone: '', website: '', bio: '', researchInterests: [] });
        const education = await safeFetch('data/education.json', { degrees: [] });
        const experience = await safeFetch('data/experience.json', { positions: [] });
        const research = await safeFetch('data/research.json', { publications: [], totalCitations: 0 });
        const projects = await safeFetch('data/projects.json', { projects: [] });
    const certifications = await safeFetch('data/certifications.json', { featuredRoles: [], certifications: [] });
        const patents = await safeFetch('data/patents.json', { patents: [] });
        const books = await safeFetch('data/books.json', { books: [] });
        const skills = await safeFetch('data/skills.json', { categories: [] });
        const awards = await safeFetch('data/awards.json', { awards: [] });
        const community = await safeFetch('data/community.json', { contributions: [] });
        const teaching = await safeFetch('data/teaching.json', { years: [], statistics: {} });

        // Load jsPDF
        const { jsPDF } = await loadJsPDF();
        const doc = new jsPDF();

        let yPos = 20;
        const leftMargin = 20;
        const rightMargin = 190;
        const lineHeight = 7;
        const pageHeight = 280;

        // Helper function to check if we need a new page
        function checkPageBreak(requiredSpace = 20) {
            if (yPos + requiredSpace > pageHeight) {
                doc.addPage();
                yPos = 20;
                return true;
            }
            return false;
        }

        // Header with gradient background effect
        doc.setFillColor(102, 126, 234);
        doc.rect(0, 0, 210, 50, 'F');
        
        // Name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text(personalInfo.name, leftMargin, yPos);
        yPos += 10;

        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.text(personalInfo.title, leftMargin, yPos);
        yPos += 7;

        // University
        doc.setFontSize(12);
        doc.text(`${personalInfo.department}, ${personalInfo.university}`, leftMargin, yPos);
        yPos += 15;

        // Contact Information
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const contactInfo = [
            `Email: ${personalInfo.email}`,
            `Phone: ${personalInfo.phone}`,
            `Web: ${personalInfo.website}`
        ];
        contactInfo.forEach(info => {
            doc.text(info, leftMargin, yPos);
            yPos += 5;
        });
        yPos += 10;

        // Professional Summary
        checkPageBreak(30);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(102, 126, 234);
        doc.text('PROFESSIONAL SUMMARY', leftMargin, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const bioLines = doc.splitTextToSize(personalInfo.bio, rightMargin - leftMargin);
        doc.text(bioLines, leftMargin, yPos);
        yPos += bioLines.length * 5 + 10;

        // Research Interests
        checkPageBreak(30);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(102, 126, 234);
        doc.text('RESEARCH INTERESTS', leftMargin, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        personalInfo.researchInterests.forEach(interest => {
            doc.text(`• ${interest}`, leftMargin + 5, yPos);
            yPos += 6;
        });
        yPos += 5;

        // Education
        if (education.degrees && education.degrees.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(102, 126, 234);
            doc.text('EDUCATION', leftMargin, yPos);
            yPos += 8;

            education.degrees.forEach(degree => {
                checkPageBreak(25);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(degree.degree, leftMargin, yPos);
                yPos += 6;
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`${degree.institution}, ${degree.year}`, leftMargin, yPos);
                yPos += 5;
                
                if (degree.specialization) {
                    doc.text(`Specialization: ${degree.specialization}`, leftMargin, yPos);
                    yPos += 5;
                }
                yPos += 3;
            });
            yPos += 5;
        }

        // Experience
        if (experience.positions && experience.positions.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(102, 126, 234);
            doc.text('PROFESSIONAL EXPERIENCE', leftMargin, yPos);
            yPos += 8;

            experience.positions.forEach(position => {
                checkPageBreak(25);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(position.title, leftMargin, yPos);
                yPos += 6;
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`${position.institution} | ${position.duration}`, leftMargin, yPos);
                yPos += 5;
                
                if (position.description) {
                    const descLines = doc.splitTextToSize(position.description, rightMargin - leftMargin - 5);
                    doc.text(descLines, leftMargin + 5, yPos);
                    yPos += descLines.length * 5;
                }
                yPos += 5;
            });
        }

        // Publications (All - Latest to Oldest)
        if (research.publications && research.publications.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(102, 126, 234);
            doc.text('PUBLICATIONS', leftMargin, yPos);
            yPos += 8;

            // Sort publications by year (latest first)
            const sortedPubs = [...research.publications].sort((a, b) => {
                const yearA = parseInt(a.year) || 0;
                const yearB = parseInt(b.year) || 0;
                return yearB - yearA;
            });

            sortedPubs.forEach((pub, index) => {
                checkPageBreak(20);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                
                const pubText = `${index + 1}. ${pub.authors}. "${pub.title}". ${pub.journal}, ${pub.year}. Citations: ${pub.citations}`;
                const pubLines = doc.splitTextToSize(pubText, rightMargin - leftMargin);
                doc.text(pubLines, leftMargin, yPos);
                yPos += pubLines.length * 5 + 2;
            });
            yPos += 5;
        }

        // Patents
        if (patents.patents && patents.patents.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(102, 126, 234);
            doc.text('PATENTS', leftMargin, yPos);
            yPos += 8;

            patents.patents.forEach((patent, index) => {
                checkPageBreak(20);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(`${index + 1}. ${patent.title}`, leftMargin, yPos);
                yPos += 5;
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.text(`Patent No: ${patent.patentNumber} | Status: ${patent.status} | ${patent.country}`, leftMargin + 5, yPos);
                yPos += 5;
                
                if (patent.abstract) {
                    const abstractLines = doc.splitTextToSize(patent.abstract, rightMargin - leftMargin - 5);
                    doc.text(abstractLines, leftMargin + 5, yPos);
                    yPos += abstractLines.length * 4 + 3;
                }
            });
            yPos += 5;
        }

        // Professional Certifications & Trainer Roles
        if ((certifications.featuredRoles && certifications.featuredRoles.length) || (personalInfo.trainerHighlights && personalInfo.trainerHighlights.length)) {
            checkPageBreak(30);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(102, 126, 234);
            doc.text('PROFESSIONAL CERTIFICATIONS & TRAINER ROLES', leftMargin, yPos);
            yPos += 8;

            const roles = (certifications.featuredRoles && certifications.featuredRoles.length)
                ? certifications.featuredRoles.map(r => ({
                    title: r.role,
                    org: r.organization,
                    years: r.years,
                    description: r.description || ''
                }))
                : personalInfo.trainerHighlights.map(t => ({ title: t }));

            roles.forEach(role => {
                checkPageBreak(18);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(`• ${role.title}`, leftMargin, yPos);
                yPos += 6;
                if (role.org || role.years || role.description) {
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    const meta = [role.org, role.years].filter(Boolean).join(' | ');
                    if (meta) { doc.text(meta, leftMargin + 5, yPos); yPos += 5; }
                    if (role.description) {
                        const lines = doc.splitTextToSize(role.description, rightMargin - leftMargin - 5);
                        doc.text(lines, leftMargin + 5, yPos);
                        yPos += lines.length * 4 + 2;
                    }
                }
            });
            yPos += 4;
        }

        // Teaching
        if (teaching.years && teaching.years.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(102, 126, 234);
            doc.text('TEACHING EXPERIENCE', leftMargin, yPos);
            yPos += 8;

            const totalCourses = teaching.statistics?.totalCourses || 0;
            const yearsTaught = teaching.statistics?.yearsTaught || teaching.years.length;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(0, 0, 0);
            doc.text(`${totalCourses} courses taught across ${yearsTaught} academic years`, leftMargin, yPos);
            yPos += 10;

            teaching.years.forEach(yearGroup => {
                checkPageBreak(20);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(yearGroup.academicYear, leftMargin, yPos);
                yPos += 6;

                if (yearGroup.courses && yearGroup.courses.length > 0) {
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    yearGroup.courses.forEach(course => {
                        checkPageBreak(8);
                        const courseText = `• ${course.title}${course.level ? ' (' + course.level + ')' : ''}`;
                        doc.text(courseText, leftMargin + 5, yPos);
                        yPos += 5;
                    });
                }
                yPos += 3;
            });
            yPos += 5;
        }

        // Skills
        if (skills.categories && skills.categories.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(102, 126, 234);
            doc.text('SKILLS & EXPERTISE', leftMargin, yPos);
            yPos += 8;

            skills.categories.forEach(category => {
                checkPageBreak(15);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(category.name + ':', leftMargin, yPos);
                yPos += 6;
                
                doc.setFont('helvetica', 'normal');
                const skillsText = category.skills.join(', ');
                const skillLines = doc.splitTextToSize(skillsText, rightMargin - leftMargin - 5);
                doc.text(skillLines, leftMargin + 5, yPos);
                yPos += skillLines.length * 5 + 3;
            });
        }

        // Awards & Honors
        if (awards.awards && awards.awards.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(102, 126, 234);
            doc.text('AWARDS & HONORS', leftMargin, yPos);
            yPos += 8;

            awards.awards.forEach(award => {
                checkPageBreak(15);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                doc.text(`• ${award.title} - ${award.date || award.year || 'N/A'}`, leftMargin + 5, yPos);
                yPos += 6;
            });
        }

        // Community Contributions
        if (community.contributions && community.contributions.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(102, 126, 234);
            doc.text('COMMUNITY CONTRIBUTIONS', leftMargin, yPos);
            yPos += 8;

            community.contributions.forEach(item => {
                checkPageBreak(25);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(item.title, leftMargin, yPos);
                yPos += 6;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                const metaLine = `${item.type} | ${item.organization || ''} | ${item.date || ''}`.replace(/\s+\|\s+$/,'');
                doc.text(metaLine, leftMargin, yPos);
                yPos += 5;

                if (item.description) {
                    const descLines = doc.splitTextToSize(item.description, rightMargin - leftMargin - 5);
                    doc.text(descLines, leftMargin + 5, yPos);
                    yPos += descLines.length * 5 + 3;
                }
            });
            yPos += 5;
        }

        // Save the PDF
        doc.save(`${personalInfo.name.replace(/\s+/g, '_')}_CV.pdf`);

        // Remove loading indicator
        document.body.removeChild(loadingDiv);

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
        const loadingDiv = document.querySelector('.fixed.inset-0');
        if (loadingDiv) document.body.removeChild(loadingDiv);
    }
}

// Export CV to LaTeX
async function exportToLaTeX() {
    try {
        // Load data
        async function safeFetch(url, fallback) {
            try {
                const res = await fetch(url);
                if (!res.ok) return fallback;
                return await res.json();
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
\\social[github]{${personalInfo.socialMedia.github}}

\\begin{document}

\\makecvtitle

% Professional Summary
\\section{Professional Summary}
${personalInfo.bio}

% Research Interests
\\section{Research Interests}
\\begin{itemize}
${personalInfo.researchInterests.map(interest => `  \\item ${interest}`).join('\n')}
\\end{itemize}

`;

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
                latex += `  \\item ${pub.authors}. ``${pub.title}''. \\textit{${pub.journal}}, ${pub.year}. Citations: ${pub.citations}.\n`;
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

        // Professional Certifications & Trainer Roles
        if ((certifications.featuredRoles && certifications.featuredRoles.length) || (personalInfo.trainerHighlights && personalInfo.trainerHighlights.length)) {
            latex += `\\section{Professional Certifications & Trainer Roles}\n\\begin{itemize}\n`;
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
