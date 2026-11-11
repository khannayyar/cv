"""Package only public website assets for GitHub Pages; no build tools required."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
output = ROOT / 'dist'
output.mkdir(exist_ok=True)
for page in ROOT.glob('*.html'):
    shutil.copy2(page, output / page.name)
for directory in ('assets', 'css', 'js', 'data'):
    shutil.copytree(ROOT / directory, output / directory, dirs_exist_ok=True)
(output / '.nojekyll').touch()
print(f'Packaged website in {output}')
