var $ = require('jquery');
var _ = require('underscore');

exports.createKernel = _.once(function() {
    return new Promise(function(resolve, reject) {
	// Create a sagecell in order to trigger the creation of a kernel
	var arrayChangeHandler = {
	    set: function(target, property, value, receiver) {
		if (property == 0) {
		    if (value != null) {
			window.setTimeout( function() {
			    resolve(value);
			}, 0);
		    }
		}
		target[property] = value;
		return true;
	    }
	};
	window.sagecell.kernels = new Proxy( window.sagecell.kernels, arrayChangeHandler );
	
	var d = document.createElement('div');    
	window.sagecell.makeSagecell({inputLocation: d, linked: true});
	d.children[0].children[1].click();
    });
});

exports.sage = function(code) {
    return new Promise(function(resolve, reject) {
	var output = function(msg) {
	    console.log("output=",msg);
	    if (msg.msg_type == "error") {
		reject(msg.content);
	    }
	    if (msg.msg_type == "execute_result") {
		resolve( msg.content.data["text/plain"] );
	    }
	};
	
	var callbacks = {iopub: {"output": output}};

	exports.createKernel().then( function(kernel) {
	    console.log("executing",code);
	    kernel.execute(code, callbacks, {
		"silent": false,
		"user_expressions": {"_sagecell_files": "sys._sage_.new_files()"}
	    });
	});
    });
};

window.sage = function(code) {
    exports.sage(code).then(
	function(result) { console.log(result); },
	function(err) { console.log("err=",err); }
    );
};

exports.bad_process = function() {
    var sageCellUrl = 'https://sagecell.sagemath.org/';
    var serviceUrl = sageCellUrl + 'service';

    $.ajax({
	type: "POST",
	url: serviceUrl,
	data: {code:'print(3+2)'},
	success: function(data) {
	    window.result = data;
	    console.log(data);
	},
	error: function() {
	    console.log("failed");
	}
    });
    
    
    var tosAccepted = new Promise(function(resolve, reject) {
	$.ajax({
	    type: "GET",
	    url: sageCellUrl + 'tos.html',
	    data: {},
	    success: function() {
		if (confirm('Do you accept the terms of service at ' + sageCellUrl + 'tos.html ?')) {
		    resolve({accepted_tos: true});		    
		} else {
		    reject();
		}
	    },
	    error: function() {
		resolve({});
	    }
	});
    });


    var kernel = new Promise(function(resolve,reject) {
	tosAccepted.then( function(acceptance) {
	    acceptance = {accepted_tos: true};
	    $.ajax({
		type: "POST",
		url: sageCellUrl + 'kernel',
		data: acceptance,
		success: function(data) {
		    console.log("data=",data);
		    var url = data.ws_url + 'kernel' + "/" + data.id + "/channels";
		    //var url = data.ws_url + 'api/kernel' + "/" + data.id + "/shell";
		    console.log(url);
		    var connection = new WebSocket(url);
		    resolve({id: data.kernel_id,
			     connection: connection});
		},
		error: reject
	    });
	});
    });


    // https://github.com/sagemath/sagecell/blob/master/doc/messages.md
    // Should check for TOS
};
