import { parseRequest } from '../src/interfaces/http/validators/parseRequest.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import { LoginUser } from '../src/application/auth/usecases/LoginUser.ts';
import { JwtTokenService } from '../src/infrastructure/security/JwtTokenService.ts';
import { UnauthorizedError } from '../src/application/errors/UnauthorizedError.ts';
import { errorMiddleware } from '../src/interfaces/http/middleware/errorMiddleware.ts';
import { RefreshTokenSchema } from '../src/interfaces/http/validators/refreshTokenSchema.ts';

const tokens = new JwtTokenService('test-access', 'test-refresh');
test('login rejects both unknown users and wrong passwords without issuing tokens', async () => {
    for (const user of [null, {id: 'u', passwordHash: 'hash'}]) {
        const login = new LoginUser(
            {findByEmail: async () => user},
            {compare: async () => false},
            {generateAccessToken: () => assert.fail('Must not issue tokens')},
        );
        await assert.rejects(login.execute({email: 'user@example.com', password: 'wrong'}),
            error => error instanceof UnauthorizedError && error.message === 'Invalid email or password');
    }
});
test('refresh translates token failures and still accepts valid tokens', () => {
    for (const token of [
        'invalid', tokens.generateAccessToken('u'),
        jwt.sign({userId: 'u'}, 'test-refresh', {expiresIn: -1}),
        jwt.sign({userId: 'u'}, 'test-refresh', {notBefore: '1h', expiresIn: '2h'}),
        jwt.sign({userId: 'u'}, 'test-refresh'),
        jwt.sign({userId: 123}, 'test-refresh', {expiresIn: '1h'}),
    ]) assert.throws(() => tokens.verifyRefreshToken(token), UnauthorizedError);
    assert.deepEqual(tokens.verifyRefreshToken(tokens.generateRefreshToken('u')), {userId: 'u'});
});
function respond(error) {
    const res = {headersSent: false, setHeader() {}, status(value) {this.statusCode = value; return this;}, json(value) {this.body = value;}};
    errorMiddleware(error, {}, res, () => assert.fail('Unexpected next'));
    return res;
}
test('middleware returns consistent authentication and validation responses', () => {
    const auth = respond(new UnauthorizedError('Invalid email or password'));
    assert.equal(auth.statusCode, 401);
    assert.equal(auth.body.error.code, 'UNAUTHORIZED');
    assert.ok(auth.body.error.requestId);
    const validation = RefreshTokenSchema.safeParse({refreshToken: ''});
    assert.equal(validation.success, false);
    assert.equal(respond(validation.error).statusCode, 500);
    let requestError;
    try { parseRequest(RefreshTokenSchema, {refreshToken: ''}); } catch (error) {requestError = error;}
    assert.equal(respond(requestError).statusCode, 400);
});
test('parser errors do not disclose the request body', () => {
    const error = Object.assign(new SyntaxError('secret password'), {type: 'entity.parse.failed', body: 'secret password'});
    const res = respond(error);
    assert.equal(res.statusCode, 400);
    assert.equal(JSON.stringify(res.body).includes('secret password'), false);
});
test('unexpected errors are generic and sent headers delegate to Express', () => {
    const original = console.error;
    const logged = [];
    console.error = (...args) => logged.push(args);
    try {
        const res = respond(new Error('database password'));
        assert.equal(res.statusCode, 500);
        assert.equal(JSON.stringify([res.body, logged]).includes('database password'), false);
    } finally { console.error = original; }
    const error = new Error('already sent');
    let forwarded;
    errorMiddleware(error, {}, {headersSent: true}, value => {forwarded = value;});
    assert.equal(forwarded, error);
});
