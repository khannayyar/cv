# Academic CV Website

An extraordinary, modern academic CV website with automated Google Scholar integration and elegant export features.

## Features

- 🎨 **Beautiful Design**: Modern, responsive design with Tailwind CSS and smooth animations
- 📊 **Auto-Updated Publications**: GitHub Actions automatically fetch publications from Google Scholar daily
- 📄 **Export Options**: Export your CV as PDF or LaTeX with a single click
- 📧 **Contact Form**: Integrated with Google Sheets for easy contact management
- 🚀 **Fast & Lightweight**: Optimized for performance
- 📱 **Fully Responsive**: Works perfectly on all devices

## Setup Instructions

### 1. Clone or Fork this Repository

```bash
git clone <your-repo-url>
cd cv
```

### 2. Configure Your Information

Edit the JSON files in the `data/` directory:

- `personal-info.json` - Your basic information
- `education.json` - Your education background
- `experience.json` - Your professional experience
- `research.json` - Auto-updated from Google Scholar
- `projects.json` - Your research projects
- `certifications.json` - Your certifications
- `skills.json` - Your skills
- `awards.json` - Your awards and honors

Optional (removed in lean build – add back if needed):
- `patents.json` (patents list)
- `books.json` (books/chapters)
- `testimonials.json` (testimonials)

### 3. Add Your Profile Image

Place your profile photo at `assets/profile.jpg`

### 4. Setup Google Scholar Auto-Update

1. Find your Google Scholar ID from your profile URL:
   - Go to your Google Scholar profile
   - The URL looks like: `https://scholar.google.com/citations?user=XXXXX`
   - Copy the ID after `user=`

2. Add it to GitHub Secrets:
   - Go to your repository Settings > Secrets and variables > Actions
   - Create a new secret named `SCHOLAR_ID`
   - Paste your Scholar ID as the value

The GitHub Action will run daily to update your publications automatically!

### 5. Setup Contact Form (Optional)

To enable the contact form with Google Sheets:

1. Create a new Google Sheet
2. Create a Google Apps Script:
   - In your sheet, go to Extensions > Apps Script
   - Replace the code with:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  
  sheet.appendRow([
    new Date(),
    data.name,
    data.email,
    data.phone,
    data.subject,
    data.message
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Deploy as Web App:
   - Click Deploy > New deployment
   - Select "Web app"
   - Execute as: Me
   - Who has access: Anyone
   - Copy the Web App URL

4. Update `contact.html`:
   - Replace `YOUR_GOOGLE_APPS_SCRIPT_URL_HERE` with your Web App URL

### 6. Deploy to GitHub Pages

1. Go to repository Settings > Pages
2. Select Source: Deploy from a branch
3. Select Branch: main (or master)
4. Select Folder: / (root)
5. Click Save

Your website will be live at: `https://yourusername.github.io/repository-name/`

## Customization

### Colors

Edit the Tailwind config in each HTML file or create a custom CSS file:

```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: '#1e40af',    // Change these
                secondary: '#7c3aed',  // to your
                accent: '#f59e0b',     // preferred colors
            }
        }
    }
}
```

### Fonts

The website uses:
- **Inter** for body text
- **Playfair Display** for headings

You can change these in the Google Fonts link and CSS.

## File Structure

```
cv/
├── index.html              # Home page
├── about.html             # About page
├── education.html         # Education page
├── experience.html        # Experience page
├── research.html          # Research interests
├── publications.html      # Publications (auto-updated)
├── projects.html          # Projects page
├── contact.html           # Contact form
├── js/
│   ├── main.js           # Main JavaScript
│   └── export.js         # PDF/LaTeX export
├── data/
│   ├── personal-info.json
│   ├── education.json
│   ├── experience.json
│   ├── research.json      # Auto-updated
│   ├── projects.json
│   ├── certifications.json
│   ├── awards.json
│   ├── skills.json
│   ├── (patents.json)     # optional
│   ├── (books.json)       # optional
│   ├── (testimonials.json)# optional
│   └── ...
├── assets/
│   └── profile.jpg       # Your photo
├── scripts/
│   └── update_research.py # Scholar scraper
└── .github/
    └── workflows/
        └── update-research.yml
```

## Technologies Used

- **Tailwind CSS** - Utility-first CSS framework
- **AOS** - Animate On Scroll library
- **Font Awesome** - Icon library
- **jsPDF** - PDF generation
- **Python** - Google Scholar scraping
- **GitHub Actions** - Automated updates

## Support

If you encounter any issues or have questions, please open an issue in the repository.

## License

MIT License - Feel free to use this template for your own academic website!

---

Made with ❤️ for academics worldwide

---
### Cleanup Summary (2025-11-08)
Removed unused optional data files (patents.json, books.json, testimonials.json) and auxiliary setup/deployment docs for a streamlined repository. Export scripts now use safe fallback loading; reintroduce a JSON file with the expected top-level key (e.g., `patents`) to have it appear again automatically.
