% ximera.cls
%
% A LaTeX2e document class for preparing exams.

%% ximera.cls
%% Copyright (c) 2013 Bart Snapp
%
% This work may be distributed and/or modified under the
% conditions of the LaTeX Project Public License, either version 1.3c
% of this license or (at your option) any later version.
% The latest version of this license is in
%   http://www.latex-project.org/lppl.txt
% and version 1.3c or later is part of all distributions of LaTeX
% version 2013/12/01 or later.
%
% This work has the LPPL maintenance status "author-maintained".
% 
% This work consists of the files ximera.cls and ximeradoc.tex.


% The user's guide for ximera.cls is in the file ximeradoc.tex.


%%% Bart Snapp
%%% Department of Mathematics
%%% The Ohio State University


\def\fileversion{.5}
\def\filedate{2013/09/16}



% ---------------------------------------------------------------------
% ---------------------------------------------------------------------
% If there's some feature that you'd like that this file doesn't
% provide, tell Bart Snapp or Jim Fowler about it.  
%
% Thanks to: 
%
% Philip Hirschhorn as this document class is based on his
% ``exam.cls.'' The original work can be found at:
% http://www-math.mit.edu/~psh/
% --------------------------------------------------------------------
% --------------------------------------------------------------------

\NeedsTeXFormat{LaTeX2e}

\ProvidesClass{ximera}[\filedate\space Version \fileversion\space by
  Bart Snapp]

\RequirePackage{ifthen}
\RequirePackage{environ}



\newif\ifprintanswers
\printanswersfalse
\DeclareOption{solutions}{\printsolutionstrue}
\DeclareOption{nosolutions}{\printsolutionsfalse}

\newif\ifcancelspace
\cancelspacefalse
\DeclareOption{cancelspace}{\cancelspacetrue}
\DeclareOption{nocancelspace}{\cancelspacefalse}


\DeclareOption*{%
  \PassOptionsToClass{\CurrentOption}{article}%
}
\ProcessOptions\relax
\LoadClass{article}
\RequirePackage{titling}



%                         *****************
%                         ** PAGE LAYOUT **
%                         *****************


% We set the parameters in terms of \paperwidth and \paperheight
% so that the options

% a4paper
% a5paper
% b5paper
% letterpaper
% legalpaper
% executivepaper
% landscape

% will all work:

\setlength{\textwidth}{\paperwidth}
\addtolength{\textwidth}{-2in}
\setlength{\oddsidemargin}{0pt}
\setlength{\evensidemargin}{0pt}

\setlength{\headheight}{15pt}
\setlength{\headsep}{15pt}
\setlength{\topmargin}{0in}
\addtolength{\topmargin}{-\headheight}
\addtolength{\topmargin}{-\headsep}
\setlength{\footskip}{29pt}
\setlength{\textheight}{\paperheight}
\addtolength{\textheight}{-2.2in}

\setlength{\marginparwidth}{.5in}
\setlength{\marginparsep}{5pt}





%--------------------------------------------------------------------
%---------------------------------------------------------------------
%
%                    ************************************
%                    ** TITLE AND ACTIVITY DESCRIPTION **
%                    ************************************
%
%
%

\pretitle{\begin{flushleft}\LARGE\bfseries}
\posttitle{\par\end{flushleft}\vskip 0.5em}
\date{}






% We use the counter name `partno' for the parts environment so that
% we will not interfere with the counter `part' used by the article
% document class.



%--------------------------------------------------------------------
%---------------------------------------------------------------------
%
%                    ***************************
%                    ** PROBLEM ENVIRONMENTS **
%                    ***************************
%
%
%


% We use the counter name `partno' for the parts environment so that
% we will not interfere with the counter `part' used by the article
% document class.

\newcounter{problem}
\NewEnviron{question}{
  \subsubsection*{Question}
  \BODY
}




\newif\ifsolutions
\solutionstrue

 \NewEnviron{solution}{
   \ifsolutions
     \subsubsection*{Solution}
     \BODY
   \else
     \subsubsection*{Solution}
     \vfill
   \fi}


\endinput
%---------------------------------------------------------------------
%---------------------------------------------------------------------
%---------------------------------------------------------------------
%---------------------------------------------------------------------
%---------------------------------------------------------------------
