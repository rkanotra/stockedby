import { APIConnectionTimeoutError, APIConnectionError, APIUserAbortError } from 'openai';
import test from 'node:test';
import assert from 'node:assert/strict';
import {generationFailure} from './generation-errors.js';
test('generation errors explain retry, quota, configuration and invalid output without claiming a save', () => {
  for (const [error,stage,code,status] of [
    [{status:429},'provider','provider_limit',429],
    [{status:401},'provider','provider_configuration',503],
    [{name:'APIConnectionTimeoutError'},'provider','generation_timeout',504],
    [new APIConnectionTimeoutError(),'provider','generation_timeout',504],
    [new APIConnectionError({message:'private network diagnostic'}),'provider','provider_unavailable',502],
    [new APIUserAbortError(),'provider','generation_cancelled',499],
    [{status:503},'provider','provider_unavailable',502],
    [new SyntaxError('private content'),'validation','invalid_output',502],
    [{status:400,message:'secret request payload'},'provider','generation_rejected',502],
  ]) {
    const result=generationFailure(error,stage);
    assert.equal(result.code,code);assert.equal(result.status,status);
    assert.doesNotMatch(result.message,/saved locally|secret|private content/);
  }
});
