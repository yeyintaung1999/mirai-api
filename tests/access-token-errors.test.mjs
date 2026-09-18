import assert from 'node:assert/strict';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../src/interfaces/http/middleware/authMiddleware.ts';
import { createErrorMiddleware } from '../src/interfaces/http/middleware/errorMiddleware.ts';
import { UnauthorizedError } from '../src/application/errors/UnauthorizedError.ts';

function respond(error) {
    const res = {headersSent:false, setHeader(){}, status(value){this.statusCode=value;return this;},json(body){this.body=body;}};
    createErrorMiddleware(() => {})(error, {}, res, assert.fail);
    return res;
}
test('invalid, expired, and invalid-payload access tokens receive the specific public message', () => {
    const previous = process.env.JWT_ACCESS_SECRET;
    process.env.JWT_ACCESS_SECRET = 'test-access';
    try {
        for (const token of [
            'invalid',
            jwt.sign({userId:'u'}, 'test-access', {expiresIn:-1}),
            jwt.sign({userId:123}, 'test-access', {expiresIn:'1h'}),
        ]) {
            let error;
            authMiddleware({headers:{authorization:`Bearer ${token}`}}, {}, value => {error=value;});
            assert.ok(error);
            const res = respond(error);
            assert.equal(res.statusCode,401);
            assert.equal(res.body.error.code,'UNAUTHORIZED');
            assert.equal(res.body.error.message,'Invalid access token');
        }
        const res = respond(new UnauthorizedError('Authorization Header is Required'));
        assert.equal(res.body.error.code,'UNAUTHORIZED');
        assert.equal(res.body.error.message,'Authorization Header is Required');
    } finally {
        if (previous === undefined) delete process.env.JWT_ACCESS_SECRET;
        else process.env.JWT_ACCESS_SECRET = previous;
    }
});
