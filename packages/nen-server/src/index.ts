export {
  handleHandshake,
  handleTerminate,
  handleStatus,
  handleRotate,
  verifyRequest,
  decryptBody,
  encryptResponse,
  encryptPayload
} from './middleware';
export type { Session, RequestMeta } from './middleware';

export { withNen } from './wrapper';
export { withNenStream } from './stream-wrapper';

export { 
  storeSession, 
  getSession, 
  deleteSession, 
  sessionExists,
  setSessionStore,
  getSessionStore,
  InMemorySessionStore
} from './store';

export type { SessionStore } from './store';

export * from './store/redis';
export * from './store/upstash';

export {
  NenError,
  NEN_ERRORS,
  describeNenCode,
} from './errors';
export type { NenErrorSpec, NenErrorName } from './errors';
