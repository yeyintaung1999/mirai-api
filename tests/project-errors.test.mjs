import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createErrorMiddleware } from '../src/interfaces/http/middleware/errorMiddleware.ts';

process.env.DB_TYPE = 'dynamodb';
process.env.USERS_TABLE_NAME = 'test-unused';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
const { dynamoDb } = await import('../src/infrastructure/database/dynamodb/client.ts');
const { handler } = await import('../src/lambda.ts');

async function request(path, body, raw = false) {
    const result = await handler({
        httpMethod: 'POST', path, headers: {'content-type': 'application/json'},
        body: raw ? body : JSON.stringify(body), isBase64Encoded: false,
        requestContext: {identity: {sourceIp: '127.0.0.1'}},
    }, {});
    const payload = JSON.parse(result.body);
    assert.equal(result.headers['x-request-id'], payload.error.requestId);
    assert.equal(result.headers['cache-control'], 'no-store');
    assert.equal(JSON.stringify(payload).includes('private-database-secret'), false);
    return {status: result.statusCode, ...payload.error};
}

test('every endpoint uses the shared error boundary through Lambda', async () => {
    const original = dynamoDb.send;
    let calls = 0;
    dynamoDb.send = async () => {calls++; return {};};
    try {
        for (const path of ['/user/register','/user/findbyid','/user/findbyemail','/auth/login','/auth/refreshToken']) {
            const result = await request(path, {});
            assert.equal(result.status, 400, path);
            assert.equal(result.code, 'VALIDATION_ERROR');
        }
        assert.equal(calls, 0);
        assert.equal((await request('/user/findbyid', {id:'bad-uuid'})).status,400);
        assert.equal(calls,0);
        for (const [path, body] of [
            ['/user/findbyid', {id:'34bfda04-686d-4d86-b04c-cde7cf3561f6'}],
            ['/user/findbyemail', {email:'missing@example.com'}],
        ]) assert.equal((await request(path,body)).status,404);
        assert.equal((await request('/auth/login', {email:'missing@example.com',password:'wrong'})).status,401);
        assert.equal((await request('/auth/refreshToken',{refreshToken:'invalid'})).status,401);
        assert.equal((await request('/missing',{})).status,404);
        assert.equal((await request('/auth/login','{',true)).code,'INVALID_JSON');
        assert.equal((await request('/auth/login','x'.repeat(110000),true)).status,413);
        dynamoDb.send = async () => ({Items:[{id:'u',email:'exists@example.com',passwordHash:'unused',createdAt:new Date().toISOString()}]});
        assert.equal((await request('/user/register',{email:'exists@example.com',password:'ExamplePass1!'})).status,409);
        dynamoDb.send = async () => {throw Object.assign(new Error('private-database-secret'), {name:'ThrottlingException'});};
        assert.equal((await request('/user/findbyemail',{email:'user@example.com'})).status,503);
        dynamoDb.send = async () => {throw new Error('private-database-secret');};
        assert.equal((await request('/user/findbyemail',{email:'user@example.com'})).status,500);
    } finally {dynamoDb.send = original;}
});

test('central mapping handles database failures and only the email unique constraint', () => {
    const middleware = createErrorMiddleware(() => {});
    for (const [error, expected] of [
        [Object.assign(new Error('private'), {code:'ECONNREFUSED'}),503],
        [Object.assign(new Error('private'), {code:'23505',constraint:'users_email_key'}),409],
        [Object.assign(new Error('private'), {code:'23505',constraint:'users_pkey'}),500],
        [new Error('private'),500],
    ]) {
        const res = {headersSent:false, setHeader(){}, status(value){this.statusCode=value;return this;},json(body){this.body=body;}};
        middleware(error, {}, res, assert.fail);
        assert.equal(res.statusCode,expected);
        assert.equal(JSON.stringify(res.body).includes('private'),false);
    }
});
