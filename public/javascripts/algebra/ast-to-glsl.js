define(['underscore'],function(_) {

    var glslOperators = {
	"+": function(operands) { var result = operands[0]; _.each(operands.slice(1),function(rhs) { result = result + "+" + rhs; }); return result; },
	"-": function(operands) { var result = operands[0]; _.each(operands.slice(1),function(rhs) { result = result + "-" + rhs; }); return result; },
	"~": function(operands) { var result = "vec2(0.0,0.0)"; _.each(operands,function(rhs) { result = result + "-" + rhs; }); return result; },
	"*": function(operands) { var result = operands[0]; _.each(operands.slice(1),function(rhs) { result = "cmul(" + result + "," + rhs + ")"; }); return result; },
	"/": function(operands) { var result = operands[0]; _.each(operands.slice(1),function(rhs) { result = "cdiv(" + result + "," + rhs + ")"; }); return result; },

	"sin": function(operands) { return "csin(" + operands[0] + ")"; },
	"cos": function(operands) { return "ccos(" + operands[0] + ")"; },
	"tan": function(operands) { return "ctan(" + operands[0] + ")"; },

	"arcsin": function(operands) { return "carcsin(" + operands[0] + ")"; },
	"arccos": function(operands) { return "carccos(" + operands[0] + ")"; },
	"arctan": function(operands) { return "carctan(" + operands[0] + ")"; },

	"arccsc": function(operands) { return "carcsin(cdiv(vec2(1.0,0)," + operands[0] + "))"; },
	"arcsec": function(operands) { return "carccos(cdiv(vec2(1.0,0)," + operands[0] + "))"; },
	"arccot": function(operands) { return "carctan(cdiv(vec2(1.0,0)," + operands[0] + "))"; },

	"csc": function(operands) { return "ccsc(" + operands[0] + ")"; },
	"sec": function(operands) { return "csec(" + operands[0] + ")"; },
	"cot": function(operands) { return "ccot(" + operands[0] + ")"; },
	
	"sqrt": function(operands) { return "cpower(" + operands[0] + ",vec2(0.5,0.0))"; },
	"sqrt": function(operands) { return "clog(" + operands[0] + ")"; },
	"^": function(operands) { return "cpower(" + operands[0] + "," + operands[1] + "))"; },
	"sqrt": function(operands) { return "cabs(" + operands[0] + ")"; },
	"apply": function(operands) { return "vec2(NaN,NaN)"; },
    };

    function astToGLSL(tree, bindings) {
	if (typeof tree === 'string') {
	    if (tree === "e")
		return "vec2(2.71828182845905,0.0)";
	    
	    if (tree === "pi")
		return "vec2(3.14159265358979,0.0)";
	    
	    if (tree === "i")
		return "vec2(0.0,1.0)";
	    
	    if (tree in bindings)
		return "vec2(" + String(bindings[tree][0]) + "," + String(bindings[tree][1]) + ")";
	    
	    return tree;
	}    
	
	if (typeof tree === 'number') {
	    return "vec2(" + String(tree) + ",0.0)";
	}
	
	if (("real" in tree) && ("imaginary" in tree))
	    return tree;
	
	var operator = tree[0];
	var operands = tree.slice(1);
	
	if (operator in glslOperators) {
	    return glslOperators[operator]( _.map( operands, function(v,i) { return astToGLSL(v,bindings); } ) );
	}
	
	return "vec2(NaN,NaN)";
    };

    /****************************************************************/
    // export
    return astToGLSL;
});
