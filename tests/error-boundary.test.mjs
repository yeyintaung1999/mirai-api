import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createErrorMiddleware } from '../src/interfaces/http/middleware/errorMiddleware.ts';
import { requestContext, requestContextMiddleware } from '../src/interfaces/http/middleware/requestContext.ts';
import { ApplicationError } from '../src/application/errors/ApplicationError.ts';

function response() {
    return { headersSent: false, headers: {}, setHeader(k,v) {this.headers[k]=v;},
        status(s) {this.statusCode=s;return this;}, json(body) {this.body=body;} };
}
const silent = createErrorMiddleware(() => {});
test('concurrent requests retain separate IDs across async boundaries', async () => {
    const ids = await Promise.all(Array.from({length: 12}, () => new Promise((resolve, reject) => {
        const res = response();
        requestContextMiddleware({}, res, () => {
            Promise.resolve().then(() => {
                const id = requestContext.getStore().requestId;
                silent(new Error('private'), {}, res, reject);
                assert.equal(res.body.error.requestId, id);
                assert.equal(res.headers['X-Request-Id'], id);
                assert.equal(res.headers['Cache-Control'], 'no-store');
                resolve(id);
            }).catch(reject);
        });
    })));
    assert.equal(new Set(ids).size, 12);
    assert.equal(requestContext.getStore(), undefined);
});
test('logger failures cannot replace HTTP errors', () => {
    const res = response();
    createErrorMiddleware(() => {throw new Error('sink unavailable');})(new Error('failure'), {}, res, assert.fail);
    assert.equal(res.statusCode, 500);
});
test('arbitrary error statuses and application 5xx messages are not exposed', () => {
    class PrivateError extends ApplicationError {statusCode=503;code='DATABASE';}
    for (const error of [Object.assign(new Error('password'), {status: 400}), new PrivateError('password'), null, 'password']) {
        const res = response();
        silent(error, {}, res, assert.fail);
        assert.equal(res.statusCode, 500);
        assert.equal(JSON.stringify(res.body).includes('password'), false);
    }
});
test('known parser failures map correctly without exposing body data', () => {
    for (const [type,status] of [['entity.too.large',413],['charset.unsupported',415],['encoding.unsupported',415],['request.aborted',400],['request.size.invalid',400]]) {
        const res = response();
        silent(Object.assign(new Error('private'), {type,body:'secret'}), {}, res, assert.fail);
        assert.equal(res.statusCode,status);
        assert.equal(JSON.stringify(res.body).includes('secret'),false);
    }
});
test('closed responses are logged without attempting another write', () => {
    for (const flag of ['destroyed','writableEnded']) {
        let logged = false;
        const res = response();res[flag]=true;res.setHeader=assert.fail;
        createErrorMiddleware(() => {logged=true;})(new Error('closed'), {}, res, assert.fail);
        assert.equal(logged,true);
        assert.equal(res.body,undefined);
    }
});

test('diagnostic logs preserve allowlisted causes without exposing private values', async () => {
    const {logHttpError} = await import('../src/infrastructure/observability/errorLogger.ts');
    const output = [];
    const original = console.error;
    console.error = value => output.push(JSON.parse(value));
    try {
        const cause = Object.assign(new Error('secret-password'), {code:'ECONNREFUSED'});
        const error = new Error('secret-token', {cause});
        cause.cause = error;
        logHttpError({event:'http_error', requestId:'test-id',status:503,code:'SERVICE_UNAVAILABLE',headersSent:false}, error);
        assert.deepEqual(output[0].diagnostics, [{kind:'Error'}, {kind:'Error',code:'ECONNREFUSED'}]);
        assert.equal(JSON.stringify(output).includes('secret-'), false);
    } finally { console.error = original; }
});

test('logging uses the route template and excludes query values', () => {
    let entry;
    const middleware = createErrorMiddleware(value => {entry = value;});
    middleware(new Error('failure'), {
        method:'POST',route:{path:'/users/:id'},originalUrl:'/users/private?token=secret',
    }, response(), assert.fail);
    assert.equal(entry.method,'POST');
    assert.equal(entry.route,'/users/:id');
    assert.equal(JSON.stringify(entry).includes('secret'),false);
});
