
import { logger } from './src/utils/logger';

console.log('--- Testing logger info ---');
logger.info({ foo: 'bar', nested: { a: 1 } }, 'Hello World');

console.log('--- Testing logger with Error ---');
const err = new Error('Something went wrong');
logger.error(err, 'Error occurred');

console.log('--- Testing logger with Circular Ref ---');
const obj: any = { a: 1 };
obj.self = obj;
logger.info(obj, 'Circular');

console.log('--- Testing logger with Shared Ref ---');
const shared = { b: 2 };
const container = { x: shared, y: shared };
logger.info(container, 'Shared');
