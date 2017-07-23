#!/bin/bash
if [ $(hostname) = ximera-1.asc.ohio-state.edu ]; then
    echo On the deployment machine.
    echo Pulling latest version from github, protecting our dotenv...
    mv -f .env .env.backup
    git pull
    mv -f .env.backup .env
    echo Updating npm...
    npm install
    echo Running gulp...
    node ./node_modules/gulp/bin/gulp.js js
    node ./node_modules/gulp/bin/gulp.js css    
    echo Stopping old copies of app.js...
    pm2 stop ximera
    echo Starting a new copy of app.js...
    export DEPLOYMENT=production
    export NODE_ENV=production
    export XIMERA_MONGO_DATABASE=production    
    pm2 start ecosystem.config.js --env production    
else
    echo not on the deployment machine...
    echo copying environment and keys to deployment machine...
    rsync -avz -f"- .git/" private_key.pem .env ximera:/var/www/apps/ximera
    ssh ximera "cd /var/www/apps/ximera ; source deploy.sh"
fi
