% ximera.cls
%
% A LaTeX2e document class for preparing exams.

%% ximera.cls
%% Copyright (c) 2013 Bart Snapp and Jim Fowler
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

%\RequirePackage{hyperref} %% this breaks something!
\RequirePackage{environ}
\RequirePackage{url}
\RequirePackage{xcolor}
%\RequirePackage{ifmtarg}% http://ctan.org/pkg/ifmtarg
\RequirePackage{xifthen}% http://ctan.org/pkg/xifthen
\RequirePackage{multido}% http://ctan.org/pkg/multido
\RequirePackage{amssymb}
\RequirePackage{amsmath}
\RequirePackage{amsthm}
\RequirePackage{pgfplots}

\newif\ifhandout
\handoutfalse
\DeclareOption{handout}{\handouttrue}

\newif\ifnewpage
\newpagefalse
\DeclareOption{newpage}{\newpagetrue}

\newif\ifnonumbers
\nonumberstrue
\DeclareOption{nonumbers}{\nonumbersfalse}

\newif\ifhints
\hintstrue
\DeclareOption{nohints}{\hintsfalse}

\newif\ifshuffle
\shufflefalse

\newif\ifspace 
\spacefalse
\DeclareOption{space}{\spacetrue}
%% This basically works for exercises, though page breaks are weird. 



\DeclareOption*{%
  \PassOptionsToClass{\CurrentOption}{article}%
}
\ProcessOptions\relax
\LoadClass{article}
\RequirePackage{titlesec} 
\RequirePackage{titletoc} 


\newcommand{\answer}[1][]{}
\newcommand{\prerequisites}[1]{}
\newcommand{\outcomes}[1]{}
\newcommand{\video}[1]{\footnote{Video link: \url{#1}}}
\newcommand{\youtube}[1]{\footnote{YouTube link: \url{#1}}}
\newcommand{\link}[1]{\footnote{Link: \url{#1}}}


\newboolean{correct}
\setboolean{correct}{true}
\newcommand{\choice}[2][]{\item #2\ifthenelse{\boolean{#1}}{\ifhandout \else \quad\checkmark\fi}{}}


\everymath{\displaystyle} %makes everymath display style could be optional


%% image environment
\NewEnviron{image}[1]{
\[
\BODY
\]}


%% interactive envrironment
\NewEnviron{interactive}[1][]{\BODY}




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

%% \setlength{\textwidth}{\paperwidth}
%% \addtolength{\textwidth}{-2in}
%% \setlength{\oddsidemargin}{0pt}
%% \setlength{\evensidemargin}{0pt}

%% \setlength{\headheight}{15pt}
%% \setlength{\headsep}{15pt}
%% \setlength{\topmargin}{0in}
%% \addtolength{\topmargin}{-\headheight}
%% \addtolength{\topmargin}{-\headsep}
%% \setlength{\footskip}{29pt}
%% \setlength{\textheight}{\paperheight}
%% \addtolength{\textheight}{-2.2in}

%% \setlength{\marginparwidth}{.5in}
%% \setlength{\marginparsep}{5pt}

%\setlength{\topsep}{10pt}



% ---------------------------------------------------------------------
% ---------------------------------------------------------------------
%
%                    ******************************************
%                    ** ACTIVITY-TITLE AND SHORT-DESCRIPTION **
%                    ******************************************
%
%
%

%% \pretitle{\begin{flushleft}\LARGE\bfseries}
%% \posttitle{\par\end{flushleft}}
%% \predate{}
%% \date{}
%% \postdate{\vskip -3em}


\newcommand{\activitytitlebreak}{\clearpage}

\newcommand*{\activityshortdescription}{}
\newcommand{\shortdescription}[1]{\def\activityshortdescription{#1}}

\titleclass{\activitytitle}{straight}[\section]
\newcounter{activitytitle}
\titleformat{\activitytitle}
            {\bfseries\LARGE\raggedright}
            {\ifnonumbers\theactivitytitle\fi}{\ifnonumbers1em\else 0em\fi}
            {}
            [\normalfont\small\itshape\raggedright\activityshortdescription\setcounter{problem}{0}]
\titlespacing*{\activitytitle}{0pt}{0pt}{2em}
\renewcommand{\theactivitytitle}{\arabic{activitytitle}}

\contentsmargin{2.55em}
\dottedcontents{activitytitle}[3.8em]{}{2.3em}{1pc}



% ---------------------------------------------------------------------
% ---------------------------------------------------------------------
%
%                    ***************************
%                    ** PROBLEM ENVIRONMENTS **
%                    ***************************
%
%






\newcounter{problem}
\newcounter{problemType}

% ---------------------------------------------------------------------
% Problem environment decorations

% The decoration for these envrionments were inspired by
% http://tex.stackexchange.com/questions/11098/nice-formatting-for-theorems?lq=1

\makeatletter%
\newcommand{\hang}{% top theorem decoration
  \begingroup%
  \setlength{\unitlength}{.005\linewidth}% \linewidth/200
    \begin{picture}(0,0)(1.5,0)%
      \linethickness{1pt} \color{black!50}%
      \put(-3,2){\line(1,0){206}}% Top line
      \multido{\iA=2+-1,\iB=50+-10}{5}{% Top hangs
        \color{black!\iB}%
        \put(-3,\iA){\line(0,-1){1}}% Top left hang
        %\put(203,\iA){\line(0,-1){1}}% Top right hang
      }%
    \end{picture}%
  \endgroup%
}%
\newcommand{\hung}{% bottom theorem decoration
  \nobreak
  \begingroup%
    \setlength{\unitlength}{.005\linewidth}% \linewidth/200
    \begin{picture}(0,0)(1.5,0)%
      \linethickness{1pt} \color{black!50}%
      \put(60,0){\line(1,0){143}}% Bottom line
      \multido{\iA=0+1,\iB=50+-10}{5}{% Bottom hangs
        \color{black!\iB}%
        %\put(-3,\iA){\line(0,1){1}}% Bottom left hang
        \put(203,\iA){\line(0,1){1}}% Bottom right hang
        \put(\iB,0){\line(60,0){10}}% Left fade out
      }%
    \end{picture}%
  \endgroup%
}%


% ---------------------------------------------------------------------
% Problem environments: Exercise, Question, Exploration

%\@ifnotmtarg{#1}{\ (#1)}}


\NewEnviron{exercise}[1][2in]{%
  \ifshuffle\iffirstproblem  % this format is shown in shuffle
  \par\addvspace{3ex}\noindent\nobreak
  \refstepcounter{problem}\refstepcounter{problemType}\postdisplaypenalty=10000 %
    {\sffamily\bfseries\upshape Exercise \ifhandout\theproblem\else\theproblem.\theproblemType\fi} \ \slshape\ignorespaces%
    \BODY % Typeset theorem body/content
    \ifhandout\ifspace\par\addvspace{#1}\nobreak\fi\fi
    \par\addvspace{.5ex}\nobreak\noindent\hung\par\addvspace{.4ex}%
    \addtocounter{problem}{-1}
    \fi
    \ifhandout\global\firstproblemfalse\fi % No more problem environments are displayed after this one
    \else 
    \par\addvspace{2ex}\noindent\nobreak % this format is shown when stand-alone
    \refstepcounter{problem}\postdisplaypenalty=10000 %
    {\sffamily\bfseries\upshape Exercise \theproblem\slshape} \ \ignorespaces%
    \BODY % Typeset theorem body/content
    \ifhandout\ifspace\par\addvspace{#1}\nobreak\fi\fi
    \par\addvspace{.5ex}\nobreak\noindent\hung\par\addvspace{.4ex}%
    \fi  
    \ifnewpage\newpage\fi
}


\NewEnviron{question}[1][2in]{%
  \ifshuffle\iffirstproblem  % this format is shown in shuffle
  \par\addvspace{3ex}\noindent\nobreak
  \refstepcounter{problem}\refstepcounter{problemType}\postdisplaypenalty=10000 %
    {\sffamily\bfseries\upshape Question \ifhandout\theproblem\else\theproblem.\theproblemType\fi} \ \slshape\ignorespaces%
    \BODY % Typeset theorem body/content
    \ifhandout\ifspace\par\addvspace{#1}\nobreak\fi\fi
    \par\addvspace{.5ex}\nobreak\noindent\hung\par\addvspace{.4ex}%
    \addtocounter{problem}{-1}
    \fi
    \ifhandout\global\firstproblemfalse\fi % No more problem environments are displayed after this one
    \else 
    \par\addvspace{2ex}\noindent\nobreak % this format is shown when stand-alone
    \refstepcounter{problem}\postdisplaypenalty=10000 %
    {\sffamily\bfseries\upshape Question \theproblem\slshape} \ \ignorespaces%
    \BODY % Typeset theorem body/content
    \ifhandout\ifspace\par\addvspace{#1}\nobreak\fi\fi
    \par\addvspace{.5ex}\nobreak\noindent\hung\par\addvspace{.4ex}%
    \fi
    \ifnewpage\newpage\fi
}



\NewEnviron{exploration}[1][2in]{%
  \ifshuffle\iffirstproblem  % this format is shown in shuffle
  \par\addvspace{3ex}\noindent\nobreak
  \refstepcounter{problem}\refstepcounter{problemType}\postdisplaypenalty=10000 %
    {\sffamily\bfseries\upshape Exploration \ifhandout\theproblem\else\theproblem.\theproblemType\fi} \ \slshape\ignorespaces%
    \BODY % Typeset theorem body/content
    \ifhandout\ifspace\par\addvspace{#1}\nobreak\fi\fi
    \par\addvspace{.5ex}\nobreak\noindent\hung\par\addvspace{.4ex}%
    \addtocounter{problem}{-1}
    \fi
    \ifhandout\global\firstproblemfalse\fi % No more problem environments are displayed after this one
    \else 
    \par\addvspace{2ex}\noindent\nobreak % this format is shown when stand-alone
    \refstepcounter{problem}\postdisplaypenalty=10000 %
    {\sffamily\bfseries\upshape Exploration \theproblem\slshape} \ \ignorespaces%
    \BODY % Typeset theorem body/content
    \ifhandout\ifspace\par\addvspace{#1}\nobreak\fi\fi
    \par\addvspace{.5ex}\nobreak\noindent\hung\par\addvspace{.4ex}%
    \fi
    \ifnewpage\newpage\fi
}


\NewEnviron{solution}{%
  \ifhandout\relax\else\par\noindent\par\nobreak\noindent
  \postdisplaypenalty=10000 %
    {\small\itshape\bfseries Solution} \ \upshape\ignorespaces%
    \small\BODY % Typeset theorem body/content
    \par\addvspace{1ex}\nobreak\noindent
    \fi
    }

\NewEnviron{hint}{%
  \ifhints\par\addvspace{.5ex}\nobreak\noindent
  \postdisplaypenalty=10000 %
                 {\small\slshape\bfseries\color{gray} Hint:\small\color{gray}} \ \slshape\ignorespaces%
                 \BODY % Typeset theorem body/content
                 \par\addvspace{.5ex}\nobreak\noindent%
                 \fi}

\makeatother



%%% shuffle environment
\newif\iffirstproblem% Condition for first problem
\NewEnviron{shuffle}[1][]{
  \shuffletrue
  \firstproblemtrue % Allow first problem environment to be set
  \BODY
  \refstepcounter{problem}\setcounter{problemType}{0}\global\shufflefalse}
           


%% multiple choice environment
\renewcommand{\theenumi}{$(\mathrm{\alph{enumi}})$}
\renewcommand{\labelenumi}{\theenumi}

\NewEnviron{multiple-choice}[1][]{
  \begin{enumerate}
    \BODY
  \end{enumerate}
}





% ---------------------------------------------------------------------
% ---------------------------------------------------------------------
%
%                    *******************************
%                    ** THEOREM-LIKE ENVIRONMENTS **
%                    *******************************
%
%
%




\newtheoremstyle{SlantTheorem}
	{\topsep}{\topsep}              %%% space between body and thm
	{\slshape}                      %%% Thm body font
	{}                              %%% Indent amount (empty = no indent)
	{\bfseries}            %%% Thm head font
	{}                              %%% Punctuation after thm head
	{3ex}                           %%% Space after thm head
	{\thmname{#1}\thmnumber{ #2}\thmnote{ \bfseries(#3)}}%%% Thm head spec
\theoremstyle{SlantTheorem}
\newtheorem{theorem}{Theorem}
\newtheorem{acknowledgement}[theorem]{Acknowledgement}
\newtheorem{algorithm}[theorem]{Algorithm}
\newtheorem{axiom}[theorem]{Axiom}
\newtheorem{claim}[theorem]{Claim}
\newtheorem{conclusion}[theorem]{Conclusion}
\newtheorem{condition}[theorem]{Condition}
\newtheorem{conjecture}[theorem]{Conjecture}
\newtheorem{corollary}[theorem]{Corollary}
\newtheorem{criterion}[theorem]{Criterion}
\newtheorem{definition}[theorem]{Definition}
\newtheorem{example}[theorem]{Example}
\newtheorem{lemma}[theorem]{Lemma}
\newtheorem{notation}[theorem]{Notation}
\newtheorem{proposition}[theorem]{Proposition}
\newtheorem{remark}[theorem]{Remark}
\newtheorem{summary}[theorem]{Summary}
\newtheorem{paradox}[theorem]{Paradox}

\renewenvironment{proof}[1][\proofname]{\begin{trivlist}\item[\hskip \labelsep \itshape \bfseries #1{}\hspace{2ex}]}
{\qed\end{trivlist}}

\renewcommand{\qedsymbol}{$\blacksquare$}





\endinput
%---------------------------------------------------------------------
%---------------------------------------------------------------------
%---------------------------------------------------------------------
%---------------------------------------------------------------------
%---------------------------------------------------------------------
