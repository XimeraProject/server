var crypto = require('crypto');

var prepositions = ["aboard", "about", "above", "across", "after", "against", "along", "alongside", "amid", "around", "as", "at", "before", "behind", "below", "beneath", "beside", "besides", "between", "beyond", "by", "despite", "down", "during", "except", "from", "into", "less", "like", "near", "nearer", "of", "off", "on", "onto", "opposite", "outside", "over", "past", "through", "throughout", "to", "toward", "towards", "under", "underneath", "unlike", "until", "up", "upon", "upside", "versus", "via", "with", "within", "without", "according to","adjacent to","ahead of","apart from","as for","as of","as per","as regards","aside from","back to","because of","close to","due to","except for","far from","inside of","instead of","left of","near to","next to","opposite of","opposite to","out from","out of","outside of","owing to","prior to","pursuant to","rather than","regardless of","right of","subsequent to","such as","thanks to","up to",'as far as','as opposed to','as soon as','as well as'];

var adjectives = ["quick", "gray", "red", "orange", "green", "blue", "purple", "magenta", "maroon", "navy", "silver", "gold", "lime", "teal", "violet", "bright", "tall", "short", "dark", "cloudy", "summer", "winter", "spring", "fall", "autumn", "windy", "noisy", "loud", "quiet", "heavy", "light", "strong", "powerful", "wonderful", "amazing", "super", "sour", "bitter", "beautiful", "good", "bad", "great", "important", "useful", "free", "fine", "sad", "proud", "lonely", "frowning","comfortable", "happy", "clever", "interesting", "famous", "exciting", "funny", "kind", "polite", "fair", "careful", "rainy", "humid", "arid", "frigid", "foggy", "windy", "stormy", "breezy", "windless", "calm", "still"];

var nouns = ['mountain','tree','lake','water','river','ocean','sea','gulf','bay','town','city','village','house','bird','fish','cat','flower','butterfly','owl','book','hummingbird','eyes','building','home','raft','number','expression','equation','manifold','group','ring','set','prime','square','hexagon','cube','quadrilateral','rectangle','rhombus','parallelogram','trapezoid','tetrahedron','octahedron','circle','sphere','dodecahedron','icosahedron','disk','line','angle','chord','arc','approximation','function','formula','calculation','matrix','solution','theorem','fact','lemma','castle'];
	     
function poeticName(text) {
    var sha = crypto
	.createHash('sha256')
        .update(text)
        .digest('hex');
    
    var buffer = new Buffer(sha, "hex");

    var n = buffer.readUInt32LE(7);
    var preposition = prepositions[n % prepositions.length];

    var n = buffer.readUInt32LE(11);
    var adjective = adjectives[n % adjectives.length];    

    var article = 'the';
    if (buffer.readUInt8(6) % 2 == 0) {
	if (adjective.substr(0,1).match(/[aeiou]/))
	    article = 'an';
	else
	    article = 'a';
    }

    var n = buffer.readUInt32LE(15);
    var noun = nouns[n % nouns.length];    

    var phrase = [preposition, article, adjective, noun].join(' ');
    function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
    }

    return capitalizeFirstLetter(phrase.toLowerCase());
}

module.exports.poeticName = poeticName;
