#!/bin/bash
if [ $(hostname) = ximera-1.asc.ohio-state.edu ]; then
    echo On the deployment machine.
    #echo stop old copies of app.js...
    #./node_modules/forever/bin/forever stop app.js
    #echo start a new copy of app.js...
    #source environment.sh
    #export DEPLOYMENT=production
    #./node_modules/forever/bin/forever start -a -l forever.log -o out.log -e err.log app.js &
else
    echo not on the deployment machine...
    echo copying environment to deployment machine...
    rsync -avz -f"- .git/" environment.sh ximera:/var/www/apps/ximera
    echo ssh to the deploy machine...
    ssh ximera "cd /var/www/apps/ximera ; source deploy.sh"
else
fi
