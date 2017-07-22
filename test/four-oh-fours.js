'use strict';

var request = require('supertest');
var app = require('../app').app;
var should = require('should');

describe('index page', function () {
    it('should provide some html', function (done) {
	request(app)
	    .get('/')
	    .set('Accept', 'text/html')	
	    .expect(200, done);
    });
});
