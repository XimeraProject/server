'use strict';

var sessionFactory = require('supertest-session');
var app = require('../../app').app;
var should = require('should');
var assert = require('assert');
var faker = require('faker');

var session = null;

before(function () {
    session = sessionFactory(app);
});

describe('completions', function () {
    var user = {};
    
    before(function(done){
	session
	    .get('/users/me')
            .set('Accept', 'application/json')	
	    .expect(200, function(err, res) {
		user = res.body;
		done();
	    });
    });
    
    // These are really integration tests, so fuzz testing is
    // acceptable

    var payload = {complete: 0.2,
		   repositoryName: faker.lorem.word(),
		   activityPath: faker.lorem.words().split(' ').join('/')
		  };
    
    var fakeHash = faker.random.uuid();
    
    it('should be storable', function (done) {
	session
	    .put('/completion/' + fakeHash)
	    .send(payload)
	    .set('Accept', 'application/json')
	    .expect('Content-Type', /json/)
	    .expect(200, function(err, res) {
		res.body.should.have.property('ok');
		res.body.ok.should.equal(true);
		done();
	    });
    });
    
    var payload2 = {complete: 0.4,
		    repositoryName: faker.lorem.word(),
		    activityPath: faker.lorem.words().split(' ').join('/')
		  };
    
    var fakeHash2 = faker.random.uuid();

    it('should be storable again', function (done) {
	session
	    .put('/completion/' + fakeHash2)
	    .send(payload2)
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
	    .get(`/users/${user._id}/completions`)
	    .set('Accept', 'application/json')
	    .expect('Content-Type', /json/)
	    .expect(200, function(err, res) {
		var completions = res.body;

		completions.filter( function(x) { return x.activityHash == fakeHash } ).should.have.length(1);
		var x = completions.filter( function(x) { return x.activityHash == fakeHash } )[0];
		x.should.have.property('activityHash').which.is.equal( fakeHash );
		x.should.have.property('activityPath').which.is.equal( payload.activityPath );
		x.should.have.property('repositoryName').which.is.equal( payload.repositoryName );
		x.should.have.property('complete').which.is.equal( payload.complete );

		completions.filter( function(x) { return x.activityHash == fakeHash2 } ).should.have.length(1);
		var x = completions.filter( function(x) { return x.activityHash == fakeHash2 } )[0];
		x.should.have.property('activityHash').which.is.equal( fakeHash2 );
		x.should.have.property('activityPath').which.is.equal( payload2.activityPath );
		x.should.have.property('repositoryName').which.is.equal( payload2.repositoryName );
		x.should.have.property('complete').which.is.equal( payload2.complete );		

		done();
	    });
    });


});
