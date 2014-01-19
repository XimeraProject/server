Greetings!
=========

In this repository, we hope to supply potential authors of Ximera
activities with all the resources they need to get started.


Contents of the repository
---------------------------

* This README.md file. 

* The GNU License.

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

`$ git clone git@github.com:bartsnapp/ximeraAdvancedGeometry.git`


### Check and organize the ximeraLatex directory

Now you should have a directory called ximeraLatex. You may rename
this directory or move it to any location on your computer.

* Compile ximeraLatex/documentation/ximeraInPractice.tex

* Compile ximeraLatex/test.tex

Both of these documents should compile at this point. If they do not,
then you probably need to upgrade your LaTeX distribution.


Suggested work flow
-------------------


Staying up to date
------------------

While we hope to solidfy the ximera.cls file, at this point we are
still in development stages.

To keep your file up to date, 

`$ git pull`