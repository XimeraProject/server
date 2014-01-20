Greetings!
=========

In this repository, we hope to supply potential authors of Ximera
activities with all the resources they need to get started.


Contents of the repository
---------------------------

* This README.md file. 

* The GNU license.

* Documentation directory containing the documentation on how to write
  a Ximera activity. You will need to typeset the file
  ximeraInPractice.tex

* The directory inTheClassRoom, containing ideas on how to use Ximera
  activities in the classroom. This is surely incomplete at the
  moment, but it is our hope that over time these materials will grow.

* The Ximera document class, ximera.cls

* A file named exampleActivityCollection.tex, a file for testing
  purposes.

* Two test directories exampleActivity1 and exampleActivity2 that
  contain exampleActivity1.tex, exampleActivity1Source.tex and
  exampleActivity2.tex, exampleActivity2Source.tex. These are example
  files.

Directions for download
-----------------------

### Register for a GitHub account

To start, you need a GitHub account. If you already have a GitHub
account, you can go on to the next step. Otherwise go to:

`https://github.com/`

and create an account.


### Obtain a git client

#### For Macintosh

Go to: 

`http://mac.github.com/`

and download GitHub for Mac.


#### For Windows

Go to: 

`http://windows.github.com/`

and download GitHub for Windows.


#### For Linux

This will depend on your flavor of Linux. However, it will be
something like:

`$ sudo apt-get install git-core`

or

`$ pacman -S git`

Regardless, a search for `git <my Linux variety>` should lead you in
the right direction.


### Clone the ximeraLatex repository

Depending on your operating system, these command may be different. 

#### For Mac or Windows

NEEDS WORK


#### For Linux

`$ git clone git@github.com:bartsnapp/ximeraLatex.git`


### Check the ximeraLatex directory

Now you should have a directory called ximeraLatex. You may rename
this directory or move it to any location on your computer.

* Compile ximeraLatex/documentation/ximeraInPractice.tex

* Compile ximeraLatex/exampleActivityCollection.tex

* Compile ximeraLatex/exampleActivity1/exampleActivity1.tex

* Compile ximeraLatex/exampleActivity2/exampleActivity2.tex

All of these documents should compile at this point. If they do not,
then you probably need to upgrade your LaTeX distribution.


Creating your GitHub repository
-------------------------------

Now that you have the ximera.cls file and can compile
exampleActivityCollection.tex, /exampleActivity1/exampleActivity1.tex,
and /exampleActivity2/exampleActivity2.tex it is time to get started
on your own GitHub repo.

You cannot build your Ximera activities in ximeraLatex. The directory
ximeraLatex's sole purpose is to give you the most recent version of
ximera.cls and some examples. Hence you must build your activities in
a new directory. In fact, you should build them in your own GitHub
repo.

To start, make a directory where your activities will live. Give this
directory a descriptive name, ximeraActivities, or something
similar. For example purposes, we will use this name, but you should
use your own. Inside of this directory, you should have

* A README.md file giving a brief explanation of what these files are.

* A LICENSE, you can simply copy the one from ximeraLatex

* A symbolic-link, or short-cut, called ximera.cls, pointed at the
  file ximera.cls found in ximeraLatex. In Linux (and Mac) you can
  produce this via:

`/ximeraUserActivities/$ ln -s /PATH/TO/ximeraLatex/ximera.cls`

where "/PATH/TO" is actually the path to ximeraLatex.

* A directory for each individual activity, named the same as the
  activity (without the .tex suffix) with a directory structure
  similar to the one found in ximeraLatex.

* A master activity file, one that is similar to
  exampleActivityCollection.tex


Writing an activity
-------------------------------

Now it is time to write your first activity. All activities should be
in their own directory, with all supporting documents also in this
directory. In particular, you will need a symbolic link to
ximeraLatex/ximera.cls in each directory. This will provide maximum
flexibility and modularity of your activity.

If you follow the directory structure suggested in ximeraLatex and in
ximeraLatex/documentation/ximeraInPractice.pdf (assuming you've
compiled it!) you will be able to compile each activity on its own, or
as a collection.



Staying up-to-date
------------------

While we hope to solidify the ximera.cls file, at this point we are
still in development stages.

To keep your file up-to-date, you may need to periodically sync or
pull the the ximera.cls within the ximeraLatex directory.

`ximeraLatex$ git fetch --all`
`ximeraLatex$ git reset --hard origin/master`

will reset your ximeraLatex directory. Note it will also overwrite
*any* modifications you have made in this directory. You should not be
building your activities in this directory.