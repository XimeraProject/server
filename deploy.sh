#!/bin/bash
if [ $(hostname) = ximera-1.asc.ohio-state.edu ]; then
    echo On the deployment machine.
    echo Pulling latest version from github...
    mv -f environment.sh environment.backup
    git pull
    mv -f environment.backup environment.sh
    echo Updating npm...
    npm install
    echo Running gulp...
    node ./node_modules/gulp/bin/gulp.js js
    node ./node_modules/gulp/bin/gulp.js css    
    echo Stopping old copies of app.js...
    ./node_modules/forever/bin/forever -c /home/deploy/local/bin/node stop ximera
    pm2 stop ximera
    echo Starting a new copy of app.js...
    source environment.sh
    export DEPLOYMENT=production
    export NODE_ENV=production
    pm2 start ecosystem.config.js --env production    
else
    echo not on the deployment machine...
    echo copying environment and keys to deployment machine...
    rsync -avz -f"- .git/" private_key.pem environment.sh ximera:/var/www/apps/ximera
    ssh ximera "cd /var/www/apps/ximera ; source deploy.sh"
fi
