import { AsyncLocalStorage } from 'node:async_hooks';

const requestContextStore = new AsyncLocalStorage();

const runWithContext = (context, handler) => requestContextStore.run(context, handler);
const getRequestContext = () => requestContextStore.getStore() || {};

const getCorrelationId = () => getRequestContext().correlationId || null;

export { runWithContext, getRequestContext, getCorrelationId };
