"""Package only public website assets for GitHub Pages; no build tools required."""
from pathlib import Path
import shutil
from build_search_index import write_index

ROOT = Path(__file__).resolve().parents[1]
write_index()
output = ROOT / 'dist'
# Recreate only this generated directory so deleted source assets cannot linger.
if output.exists():
    shutil.rmtree(output)
output.mkdir()
for page in ROOT.glob('*.html'):
    shutil.copy2(page, output / page.name)
for directory in ('assets', 'css', 'js', 'data'):
    shutil.copytree(ROOT / directory, output / directory, dirs_exist_ok=True)
(output / '.nojekyll').touch()
print(f'Packaged website in {output}')
