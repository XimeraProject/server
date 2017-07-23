'use strict';

var sessionFactory = require('supertest-session');
var app = require('../../app').app;
var should = require('should');
var assert = require('assert');
var faker = require('faker');

var session = null;
var otherSession = null;

before(function () {
    session = sessionFactory(app);
    otherSession = sessionFactory(app);
});

describe('state', function () {
    var user = {};

    // These are really integration tests, so fuzz testing is
    // acceptable
    
    var hash = {name: faker.name.firstName(),
		title: faker.name.title(),
		data: { number: faker.random.number(),
			word: faker.lorem.word() },
		list: [ faker.lorem.text(), faker.lorem.text() ]
	       };
    var hash2 = {blah: faker.name.firstName(),
		 whee: faker.name.title()
		};    

    var fakeId = faker.random.uuid();
    var fakeId2 = faker.random.uuid();    
    
    it('should be storable', function (done) {
	session
	    .put('/state/' + fakeId)
	    .send(hash)
	    .set('Accept', 'application/json')
	    .expect('Content-Type', /json/)
	    .expect(200, function(err, res) {
		res.body.should.have.property('ok');
		res.body.ok.should.equal(true);
		done();
	    });
    });

    it('should be storable with multiple keys', function (done) {
	session
	    .put('/state/' + fakeId2)
	    .send(hash2)
	    .set('Accept', 'application/json')
	    .expect('Content-Type', /json/)
	    .expect(200, function(err, res) {
		res.body.should.have.property('ok');
		res.body.ok.should.equal(true);
		done();
	    });
    });

    it('should be retrievable', function (done) {
	session
	    .get('/state/' + fakeId)
	    .set('Accept', 'application/json')
	    .expect('Content-Type', /json/)
	    .expect(200, function(err, res) {
		assert.deepEqual(res.body, hash);
		done();
	    });
    });

    it('should be retrievable with multiple keys', function (done) {
	session
	    .get('/state/' + fakeId2)
	    .set('Accept', 'application/json')
	    .expect('Content-Type', /json/)
	    .expect(200, function(err, res) {
		assert.deepEqual(res.body, hash2);
		done();
	    });
    });

    it('should not be retrievable by others', function (done) {
	otherSession
	    .get('/state/' + fakeId)
	    .set('Accept', 'application/json')
	    .expect('Content-Type', /json/)
	    .expect(200, function(err, res) {
		assert.deepEqual(res.body, {});
		done();
	    });
    });    

});
