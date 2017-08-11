'use strict';

var sessionFactory = require('supertest-session');
var app = require('../../app').app;
var should = require('should');
var faker = require('faker');
var assert = require('assert');
var validator = require('validator');

var session = null;
var otherSession = null;

before(function () {
    session = sessionFactory(app);
    otherSession = sessionFactory(app);    
});

describe('the current user', function () {
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
    
    it('should include an id', function () {
	user.should.have.property('_id');
    });

    it('is available at /users/:id', function (done) {
	session
	    .get('/users/' + user['_id'])
	    .expect(200, done);
    });

    // These are really integration tests, so fuzz testing is
    // acceptable
    
    var updatedData = {
	email: faker.internet.email(),
	birthday: faker.date.past(),
	website: faker.internet.url(),
	biography: faker.lorem.text(),
	displayName: faker.name.firstName()
    };

    it('can be updated at /users/:id', function (done) {
	session
	    .post('/users/' + user['_id'])
	    .send(updatedData)
	    .expect(200, done);
    });

    it('can not be updated at by another person', function (done) {
	otherSession
	    .post('/users/' + user['_id'])
	    .send(updatedData)
	    .expect(403, done);
    });    

    it('can be retrieved a second time', function (done) {
	session
	    .get('/users/me')
            .set('Accept', 'application/json')		
	    .expect(200, function(err, res) {
		user = res.body;
		done();
	    });	
    });

    it('should include new email', function () {
	user.should.have.property('email');
	validator.normalizeEmail(user.email).should.equal( validator.normalizeEmail(updatedData.email) );
    });

    it('should include new birthday', function () {
	user.should.have.property('birthday');
	assert.deepEqual( validator.toDate(user.birthday), validator.toDate(updatedData.birthday) );
    });

    it('should include new website', function () {
	user.should.have.property('website');
	user.website.should.equal( updatedData.website );	
    });

    it('should include new biography', function () {
	user.should.have.property('biography');
	user.biography.should.equal( updatedData.biography );	
    });

    it('should include new display name', function () {
	user.should.have.property('displayName');
	user.displayName.should.equal( updatedData.displayName );	
    });                    
});
