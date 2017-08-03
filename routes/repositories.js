/* Accessing the repositories stored on the filesystem through nodegit
 * is tragically slow.  This module, by acting as an intermediary to
 * everything nodegit, provides us with an opportunity to cache its
 * output (and invalidate that cache whenever we receive a push). 
 */

