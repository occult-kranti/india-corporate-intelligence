/** Deferred, static reviewed data. The normalized source remains byte-pinned for audit. */
import encoded from './transport-key-dictionary/transport.kd.json';
import { decodeReviewedTransport } from './transport-key-dictionary/decoder.mjs';
export default decodeReviewedTransport(encoded);
