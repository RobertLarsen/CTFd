(require :sb-bsd-sockets)

(defpackage kv-server
  (:use :cl :sb-bsd-sockets))

(in-package kv-server)

(defvar *port* 7000)

(defvar *data* nil)

(defun get-data ()
	*data*)

(defun split (string)
	(let ((space-position (position #\: string)))
		(list 
			(subseq string 0 space-position) 
			(subseq string (+ space-position 1)))))

(defun find-data (key)
    (find-if 
	    #'(lambda (X) 
			    (equalp (first X) key)) 
			(get-data)))

(defun save-data (line)
	(setf *data* (append *data* (list (split (subseq line 5 ))))))

(defun load-data (line)
	(find-data (subseq line 5)))

(defun custom-selector (line)
	(eval (read-from-string (subseq line 7))))

(defun make-echoer (stream id disconnector)
  (lambda (_)
    (declare (ignore _))
    (handler-case
        (let ((line (read-line stream)))
          (setf line (subseq line 0 (1- (length line))))
          (cond ((string= line "quit")
                 (funcall disconnector stream))
				((and (not (null (search "save" line))) (= 0 (search "save" line)))
				 (save-data line)
				 (funcall disconnector stream))
				((and (not (null (search "load" line))) (= 0 (search "load" line)))
				 (format stream "~a~%" (load-data line))
				 (force-output stream)
				 (funcall disconnector stream))
				((and (not (null (search "custom" line))) (= 0 (search "custom" line)))
				 (format stream "~a~%" (custom-selector line))
				 (force-output stream)
				 (funcall disconnector stream))
                (t
                 (format t "~a: ~a~%" id line)
                 ;;(format stream "~a: ~a~%" id line)
                 ;;(force-output stream)
				 (funcall disconnector stream))))
      (error (e)
	  	(progn
			(print "ERROR START")
			(print e)
        	(funcall disconnector stream)
			(print "ERRor end"))))))

(defun make-disconnector (socket id)
  (lambda (client-stream)
    (let ((fd (socket-file-descriptor socket)))
      (format t "~a: closing~%" id)
      (sb-impl::invalidate-descriptor fd)
	  (sb-impl::ignore-interrupt sb-unix:sigpipe) 
	  (ignore-errors (socket-close socket))
	  (ignore-errors (close client-stream))
	  )))

(defun serve (socket id)
  (let ((stream (socket-make-stream socket :output t :input t))
        (fd (socket-file-descriptor socket)))
    (sb-impl::add-fd-handler fd
                             :input
                             (make-echoer stream
                                          id
                                          (make-disconnector socket id)))))

(defun kv-server (&optional (port *port*))
  (let ((socket (make-instance 'inet-socket :type :stream :protocol :tcp))
        (counter 0))
    (socket-bind socket #(0 0 0 0) port)
    (socket-listen socket 5)
    (sb-impl::add-fd-handler (socket-file-descriptor socket)
                             :input
                             (lambda (_)
                               (declare (ignore _))
                               (incf counter)
                               (format t "Accepted client ~A~%" counter)
                               (serve (socket-accept socket) counter)))))

#+sb-thread
(sb-thread:make-thread (lambda ()
                         (kv-server)
                         (loop
                            (sb-impl::serve-all-events))))
#-sb-thread
(kv-server)

