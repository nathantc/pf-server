var user = require('../lib/user'),
    User = require('../lib/userSchema').User,
    bcrypt = require('bcrypt'),
    assert = require('assert'),
    sinon = require('sinon');

describe('user.login:', function() {
    var req, res;

    beforeEach(function() {
        req = { session: {} };
        res = { send: function() {}};
        res.send = sinon.spy();

        User.findOne = sinon.stub();
        bcrypt.compareSync = sinon.stub();
    });


    describe('when submitting valid credentials, it', function() {

        var storedUser = {
            username: 'profile-username',
            password: 'hashed-password'
            },
            error = undefined;

        beforeEach(function() {

            User.findOne.callsArgWith(1, error, storedUser);
            bcrypt.compareSync.returns(true);

            req.body = { username: 'valid-username', password: 'valid-password'};
            user.login(req, res)
        });

        it('retrieves user information for submitted username', function() {
            assert(User.findOne.calledWith({username: 'valid-username'}));
        });

        it('compares submitted password with hashed password', function() {
            assert(bcrypt.compareSync.calledWith('valid-password', 'hashed-password'));
        });

        it('assigns the "profile" username to session', function() {
            assert.equal('profile-username', req.session.user);
        });

        it('returns successful 202 status code', function() {
            assert(res.send.calledWith(202));
        })
    });

    describe('when submitting an INVALID password, it', function() {

        var storedUser = {
            username: 'valid-username',
            password: 'hashed-password'
            },
            error = undefined;

        beforeEach(function() {
            User.findOne.callsArgWith(1, error, storedUser);
            bcrypt.compareSync.returns(false);
            req.body = { username: 'valid-username', password: 'invalid-password'};
            user.login(req, res);
        });

        it('does not assign values to session', function() {
            assert.equal(undefined, req.session.user);
        });

        it('returns failed error code 403', function() {
            assert(res.send.calledWith('Invalid username or password.', 403));
        });
    });

    describe('when submitting INVALID username', function() {

        var storedUser = undefined,
            error = undefined;

        beforeEach(function() {
            User.findOne.callsArgWith(1, error, storedUser);
            bcrypt.hashSync = sinon.spy();
            req.body = { username: 'invalid-username'};
            user.login(req, res);
        });

        it('does not assign values to session', function() {
            assert.equal(undefined, req.session.user);
        });

        it('returns failed error code 403', function() {
            assert(res.send.calledWith('Invalid username or password.', 403));
        });
    });

    describe('when User.findOne returns error', function() {

        var storedUser = undefined,
            error = 'error thrown by findOne';

        beforeEach(function() {
            User.findOne.callsArgWith(1, error, storedUser);
            req.body = { username: 'username'};
            user.login(req, res);
        });

        it('returns failed error code 500', function() {
            assert(res.send.calledWith('Error occurred retrieving user profile: error thrown by findOne', 500))
        })
    });

    describe('when user already authenticated', function() {
        beforeEach(function() {
            bcrypt.hashSync = sinon.spy();
            req.session = {user: 'already-authenticated'};
            req.body = { username: 'valid-username', password: 'valid-password'};
            user.login(req, res);
        });

        it('does not retrieve user information for submitted username', function() {
            assert(User.findOne.notCalled);
        });

        it('does not encrypt submitted password using user salt value', function() {
            assert(bcrypt.hashSync.notCalled);
        });

        it('does not assign values to session', function() {
            assert.equal('already-authenticated', req.session.user);
        });

        it('returns failed error code 409', function() {
            assert(res.send.calledWith('User is already authenticated. Logout before attempting another login.', 409));
        });
    });

});