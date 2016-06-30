'use strict';

var request = require('supertest');
var app = require('../app').app
var should = require('should');

describe('index page', function () {
    it('should return some html given the url /', function (done) {
	request(app)
	    .get('/')
	    .expect(200, done);
    });
});
