-- 简化利润分析视图（示例），按日聚合
CREATE OR REPLACE VIEW v_daily_profit AS
SELECT
  DATE(t."soldDate") AS day,
  SUM(COALESCE((t."soldPrice")::numeric, 0)) AS sold_total,
  SUM(COALESCE((t."purchasePrice")::numeric, 0)) AS purchase_total
FROM "Transaction" t
GROUP BY 1
ORDER BY 1;










