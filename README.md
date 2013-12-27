The XIMERA Project
==================

LaTeX to online interactive materials. 


Concerning the .xim files
-------------------------

Since Ximera will pull all latex files, it is often convienent to have ".tex" files around that are not seen by Ximera. 
We use the file extension ".xim" for these files. 

To enable syntax highlighting in Emacs, use 

    (setq auto-mode-alist
     (append
         '(("\\.xim\\'" . latex-mode))
          auto-mode-alist))
