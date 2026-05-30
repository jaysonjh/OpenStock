// ═══════════════════════════════════════════════════════════════
// Adanos Sentiment Provider — 入口
// 向全局注册表注册 adanos provider
// ═══════════════════════════════════════════════════════════════

import { registerSentimentProvider } from '../../core/registry';
import { AdanosAdapter } from './adapter';

registerSentimentProvider('adanos', () => new AdanosAdapter());
