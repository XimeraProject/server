The XIMERA Project
==================
LaTeX to online interactive materials. 


Setting up a server
===================

1. Install `g++`, `nodejs` and `mongodb` on your computer (under Debian, may also need `nodejs-legacy` package)
2. Run an instance of mongo server:

        mongod --dbpath <insert-your-path>
You may have to make the path. For example,

        mkdir -p /tmp/data/db
        mongod --dbpath /tmp/data/db
3. Fetch and unpack the [sample database](https://drive.google.com/file/d/0B-Xh-RAGRDU8WHAxeUJfVGpTSk0/edit?usp=sharing)
Unpack the tarball:

        tar xfzv database.tar.gz
This creates a directory containing BSON and JSON files

4. Import the database into mongo:

        mongorestore <path-to-db-directory-with-BSON-files>

5. Clone the repository:

        git clone https://github.com/kisonecat/ximera

6. Create file `env.sh` with content:

        export XIMERA_MONGO_URL=127.0.0.1
        export XIMERA_MONGO_DATABASE=test
        export XIMERA_COOKIE_SECRET=thisismysecretcookieyoushouldchangethis
        export COURSERA_CONSUMER_KEY=thisisacourserakey
        export COURSERA_CONSUMER_SECRET=courserasecretkey
        export LTI_KEY=myltikey
        export LTI_SECRET=myltisecret
        export GITHUB_WEBHOOK_SECRET=githubwebhooksecret

Type source `env.sh` to execute those commands

Note that if you used a different database name, you should set XIMERA_MONGO_DATABASE to the name of your database.

7. Go into the `ximera` directory within the `kisonecat` repository and use `npm` to install all other js scripts needed by the server

        cd <path-to-ximera>
        npm install (you may be required to answer a prompt or two)
You might have to install bower by running the following commands

        node ./node_modules/bower/bin/bower install
        cd ./components/mathquill
        npm install
        cd ../..
        mkdir -p components/syntaxhighlighter/amd
        node node_modules/requirejs/bin/r.js -convert components/syntaxhighlighter/scripts components/syntaxhighlighter/amd
8. Run the `ximera` server `apps.js` using:

        node app.js

9. View the `ximera` server in your web browser at `localhost:3000`
