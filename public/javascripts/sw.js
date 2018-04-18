var version = require('../../package.json').version;

var mathjaxRoot = '/node_modules/mathjax/';

var cacheUrls = [
    '/public/v' + version + '/javascripts/main.min.js',
    '/public/v' + version + '/stylesheets/base.css',
    '/public/v' + version + '/images/logo/logo.svg',
    '/public/v' + version + '/1.2.21/images/osu/osu-web-footer-wordmark-rev.png',
    '/public/json/symbols.json',
    '/node_modules/guppy-dev/build/guppy-default.min.css',
    mathjaxRoot + 'config/TeX-AMS_HTML.js',
    mathjaxRoot + 'extensions/TeX/newcommand.js',
    mathjaxRoot + 'extensions/TeX/color.js',
    mathjaxRoot + 'jax/output/HTML-CSS/jax.js',
];

self.addEventListener('install', function(event) {
    console.log('Service Worker installing.');    
    
    event.waitUntil(
	caches.open(version).then(function(cache) {
	    return cache.addAll(cacheUrls);
	})
    );
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker activating.');
    
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
	var url = requestClone.url.split('?')[0];
	console.log("Checking mathjax cache...");
	return event.respondWith(caches.match(url).then(function(response) {
	    console.log("Found!",response);
	    if (response !== undefined) {	    
		return response;
	    } else {
		return fetch(event.request);
	    }
	}));
    }
    
    event.respondWith(caches.match(event.request).then(function(response) {
	// caches.match() always resolves
	// but in case of success response will have value
	if (response !== undefined) {
	    return response;
	} else {
	    return fetch(event.request);
	}
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
