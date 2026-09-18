import assert from 'node:assert/strict';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import { GetCurrentUser } from '../src/application/user/usecases/GetCurrentUser.ts';
import { NotFoundError } from '../src/application/errors/NotFoundError.ts';

test('current user output excludes the password hash and missing users return not found', async () => {
    const user = {id:'user-a', email:'a@example.com', createdAt:new Date(), passwordHash:'private'};
    const useCase = new GetCurrentUser({findById: async id => {assert.equal(id,'user-a');return user;}});
    assert.deepEqual(await useCase.execute('user-a'), {id:user.id,email:user.email,createdAt:user.createdAt});
    await assert.rejects(new GetCurrentUser({findById:async () => null}).execute('missing'),NotFoundError);
});

test('GET /user/me uses authenticated identity and rejects unauthenticated requests', async () => {
    process.env.DB_TYPE='dynamodb';
    process.env.USERS_TABLE_NAME='test-unused';
    process.env.JWT_ACCESS_SECRET='test-access';
    process.env.JWT_REFRESH_SECRET='test-refresh';
    const {dynamoDb} = await import('../src/infrastructure/database/dynamodb/client.ts');
    const {handler} = await import('../src/lambda.ts');
    const original=dynamoDb.send;
    let calls=0;
    dynamoDb.send=async command => {
        calls++;
        assert.equal(command.input.Key.id,'user-a');
        return {Item:{id:'user-a',email:'a@example.com',passwordHash:'private',createdAt:new Date().toISOString()}};
    };
    const event={httpMethod:'GET',path:'/user/me',headers:{},queryStringParameters:{id:'user-b'},body:null,isBase64Encoded:false,requestContext:{identity:{sourceIp:'127.0.0.1'}}};
    try {
        const unauthorized=await handler(event,{});
        assert.equal(unauthorized.statusCode,401);
        assert.equal(calls,0);
        const token=jwt.sign({userId:'user-a'},'test-access',{expiresIn:'15m'});
        const response=await handler({...event,headers:{authorization:`Bearer ${token}`}},{});
        assert.equal(response.statusCode,200);
        assert.equal(response.headers['cache-control'],'no-store');
        const body=JSON.parse(response.body);
        assert.equal(body.id,'user-a');
        assert.equal('passwordHash' in body,false);
        dynamoDb.send=async () => ({});
        const missing=await handler({...event,headers:{authorization:`Bearer ${token}`}},{});
        assert.equal(missing.statusCode,404);
    } finally {dynamoDb.send=original;}
});
