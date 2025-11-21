/**
 * 简易汇率同步脚本（示例）：
 * - 从自定义来源获取 CNY/JPY/USD 互转汇率
 * - 以当天日期 upsert 到 ExchangeRate
 */
import { prisma } from "../lib/prisma";

async function main() {
  const today = new Date();
  const dateISO = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const pairs = [
    { base: 'CNY', quote: 'JPY', rate: '21.0' },
    { base: 'JPY', quote: 'CNY', rate: (1/21.0).toFixed(8) },
    { base: 'USD', quote: 'CNY', rate: '7.0' },
    { base: 'CNY', quote: 'USD', rate: (1/7.0).toFixed(8) },
  ];
  for (const p of pairs) {
    await prisma.exchangeRate.upsert({
      where: { baseCurrency_quoteCurrency_rateDate: { baseCurrency: p.base, quoteCurrency: p.quote, rateDate: dateISO as any } },
      update: { rate: p.rate as any, source: 'manual-script' },
      create: { baseCurrency: p.base, quoteCurrency: p.quote, rate: p.rate as any, rateDate: dateISO as any, source: 'manual-script' },
    });
  }
  console.log('Exchange rates synced for', dateISO.toISOString().slice(0,10));
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });










