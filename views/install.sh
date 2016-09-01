#! /bin/bash

echo "Create a texmf directory..."
mkdir -p ~/texmf/tex/latex

echo "Clone or update ximeraLatex..."
(cd ~/texmf/tex/latex && git clone https://github.com/XimeraProject/ximeraLatex.git) || (cd ~/texmf/tex/latex/ximeraLatex && git pull)

echo "Download mutool from a repository..."
mkdir -p ~/.local/bin
curl http://launchpadlibrarian.net/205812926/mupdf-tools_1.7-1_amd64.deb | dpkg-deb --fsys-tarfile - | tar -xf - ./usr/bin/mutool -O > ~/.local/bin/mutool
chmod +x ~/.local/bin/mutool

echo "Clone or update xake..."
(cd ~ && git clone https://github.com/XimeraProject/xake.git) || (cd ~/xake && git pull)

echo "Install dependencies for xake..."
cd ~/xake && npm install

echo "Add the 'xake' command..."
mkdir -p ~/.local/bin
ln -s ~/xake/app.js ~/.local/bin/xake

echo "Download some demo content..."
(cd ~ && git clone https://github.com/xandbox/xandbox.git) || (cd ~/xandbox && git pull)

echo "Done."
