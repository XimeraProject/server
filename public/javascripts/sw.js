var version = require('../../package.json').version;

var mathjaxRoot = '/node_modules/mathjax/';

var cacheUrls = [
    '/public/v' + version + '/javascripts/main.min.js',
    '/public/v' + version + '/stylesheets/base.css',
    '/public/v' + version + '/images/logo/logo.svg',
    '/public/v' + version + '/images/osu/osu-web-footer-wordmark-rev.png',
    '/public/json/symbols.json',
    '/node_modules/guppy-dev/build/guppy-default.min.css',
    mathjaxRoot + '/jax/input/TeX/jax.js',   
    mathjaxRoot + '/jax/element/mml/jax.js',   
    mathjaxRoot + '/jax/output/HTML-CSS/jax.js', 
    mathjaxRoot + '/jax/output/HTML-CSS/fonts/TeX/fontdata.js',
    mathjaxRoot + '/extensions/TeX/AMSmath.js',  
    mathjaxRoot + '/extensions/MathEvents.js',   
    mathjaxRoot + '/extensions/TeX/AMSsymbols.js', 
    mathjaxRoot + '/extensions/TeX/noErrors.js',   
    mathjaxRoot + '/extensions/TeX/noUndefined.js',
    mathjaxRoot + '/extensions/TeX/color.js',  
    mathjaxRoot + '/extensions/TeX/cancel.js',
    mathjaxRoot + '/extensions/toMathML.js',    
    mathjaxRoot + '/extensions/AssistiveMML.js',
    mathjaxRoot + '/extensions/MathMenu.js',
    mathjaxRoot + '/extensions/MathZoom.js',        
    mathjaxRoot + '/extensions/a11y/accessibility-menu.js',
];

//GET /node_modules/mathjax//jax/input/TeX/config.js?V=2.7.3 200 8.363 ms - 1268
//GET /node_modules/mathjax//extensions/tex2jax.js?V=2.7.3 200 5.973 ms - 6959
//GET /node_modules/mathjax//jax/output/HTML-CSS/config.js?V=2.7.3 200 8.134 ms - 3570
//GET /node_modules/mathjax//extensions/fast-preview.js?V=2.7.3 200 5.903 ms - 3177
//GET /node_modules/mathjax//extensions/CHTML-preview.js?V=2.7.3 200 5.184 ms - 829

self.addEventListener('install', function(event) {
    event.waitUntil(
	caches.open(version).then(function(cache) {
	    return cache.addAll(cacheUrls);
	})
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
	caches.keys().then(function(cacheNames) {
	    return Promise.all(
		cacheNames.filter(function(cacheName) {
		    return (cacheName != version);
		}).map(function(cacheName) {
		    return caches.delete(cacheName);
		})
	    );
	})
    );
});

// cache woff
self.addEventListener('fetch', function(event) {
    // Eliminate query strings from mathjax requests
    if (event.request.url.startsWith(mathjaxRoot)) {
        var requestClone = event.request.clone();

	var normalizedUrl = new URL(event.request.url);
	normalizedUrl.search = '';
	
	return event.respondWith(caches.match(normalizedUrl).then(function(response) {
	    console.log("Found!",response);
	    if (response !== undefined) {	    
		return response;
	    } else {
		return fetch(event.request);
	    }
	}));
    }
    
    event.respondWith(caches.open(version).then(function(cache) {
	return cache.match(event.request).then(function(response) {
	    // caches.match() always resolves
	    // but in case of success response will have value
	    if (response !== undefined) {
		return response;
	    } else {
		return fetch(event.request);
	    }
	})
    }));

    return;		      

    
  event.respondWith(caches.match(event.request).then(function(response) {
    // caches.match() always resolves
    // but in case of success response will have value
    if (response !== undefined) {
      return response;
    } else {
      return fetch(event.request).then(function (response) {
        // response may be used only once
        // we need to save clone to put one copy in cache
        // and serve second one
        var responseClone = response.clone();
        
        caches.open(version).then(function (cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(function () {
        return caches.match('/sw-test/gallery/myLittleVader.jpg');
      });
    }
  }));
});
