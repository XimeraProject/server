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

* A test file, text.tex, in the Ximera document class that should
  compile for you.

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


### Check and organize the ximeraLatex directory

Now you should have a directory called ximeraLatex. You may rename
this directory or move it to any location on your computer.

* Compile ximeraLatex/documentation/ximeraInPractice.tex

* Compile ximeraLatex/test.tex

Both of these documents should compile at this point. If they do not,
then you probably need to upgrade your LaTeX distribution.


Creating your GitHub repository
-------------------------------

Now that you have the ximera.cls file and can compile test.tex, it is
time to get started on your own GitHub repo.

To start, make a directory where your activites will live. Give this
directory a descriptive name, ximeraUserActivities, or something
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
  activity (without the .tex suffix)

* A master activity .tex file. 


Staying up-to-date
------------------

While we hope to solidfy the ximera.cls file, at this point we are
still in development stages.

To keep your file up-to-date, 

`$ git pull`